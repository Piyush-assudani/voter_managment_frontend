'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { apiFetch, getApiError } from '@/lib/api';
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

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selected, setSelected] = useState<Worker | null>(null);
  const [voters, setVoters] = useState<AssignedVoter[]>([]);
  const [votersSource, setVotersSource] = useState<'assigned' | 'scope'>('assigned');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadingWorkerId, setLoadingWorkerId] = useState<number | string | null>(null);
  const [error, setError] = useState('');
  const [currentOrgId, setCurrentOrgId] = useState('');
  const [modalSearch, setModalSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const selectedOrg = typeof window !== 'undefined' ? window.localStorage.getItem('selectedClientOrgId') || '' : '';
      setCurrentOrgId(selectedOrg);
      const query = selectedOrg && selectedOrg !== 'all' ? `?organizationId=${encodeURIComponent(selectedOrg)}` : '';
      const response = await apiFetch(`/users/workers${query}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'कार्यकर्ता सूची लोड नहीं हुई।'));
      setWorkers((await response.json()) as Worker[]);
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

      // 1. Try directly assigned voters by name/email
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

      // 2. If no voters are directly assigned by name, fallback to worker's scope (Ward / Booth / All)
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

  return (
    <div className="work-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow-label">
            <span className="eyebrow-mark" /> FIELD TEAM
          </div>
          <h1>कार्यकर्ता</h1>
          <p>सक्रिय खातों, scope और मतदाता assignments को डेटाबेस से देखें।</p>
        </div>
        <div className="feature-actions">
          <button className="button-secondary" type="button" onClick={() => void load()} disabled={loading}>
            {loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />} रिफ्रेश
          </button>
          <Link
            className="button-primary"
            href="/accounts"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <UserPlus size={15} /> खाता प्रबंधित करें
          </Link>
        </div>
      </div>

      {error && (
        <div className="inline-notice error-notice" role="alert">
          {error}
        </div>
      )}

      <section className="feature-metrics">
        <article className="metric-card">
          <span>कुल कार्यकर्ता</span>
          <strong>{loading ? '—' : workers.length}</strong>
          <small>
            {currentOrgId && currentOrgId !== 'all'
              ? workers[0]?.organizationName
                ? `${workers[0].organizationName} के खाते`
                : 'इस क्लाइंट के खाते'
              : 'इस संगठन के खाते'}
          </small>
        </article>
        <article className="metric-card metric-card-green">
          <span>सक्रिय</span>
          <strong>{loading ? '—' : workers.filter((item) => item.isActive).length}</strong>
          <small>लॉगिन सक्षम</small>
        </article>
        <article className="metric-card">
          <span>आवंटित मतदाता</span>
          <strong>{loading ? '—' : workers.reduce((sum, item) => sum + item.assignedVoters, 0)}</strong>
          <small>नाम/email assignment match</small>
        </article>
      </section>

      {loading && !workers.length ? (
        <div className="records-panel empty-state">
          <LoaderCircle size={20} className="spin" />
          <p>कार्यकर्ता लोड हो रहे हैं…</p>
        </div>
      ) : workers.length ? (
        <section className="worker-card-grid">
          {workers.map((worker) => {
            const cleanPhone = (worker.phone || '').replace(/\D/g, '');
            const hasValidPhone = cleanPhone.length >= 10 && cleanPhone !== '0000000000';
            const isThisLoading = loadingWorkerId === worker.id;

            return (
              <article className="worker-card" key={worker.id}>
                <div className="worker-card-top">
                  <span className="worker-avatar">
                    {(worker.name || worker.email).slice(0, 1).toLocaleUpperCase()}
                  </span>
                  <span className={`record-status ${worker.isActive ? 'status-voted' : 'status-pending'}`}>
                    {worker.isActive ? 'सक्रिय' : 'बंद'}
                  </span>
                </div>
                <h2>{worker.name || worker.email}</h2>
                <p className="worker-email">{worker.email}</p>
                {worker.organizationName && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12px',
                      color: '#047857',
                      background: '#ecfdf5',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      margin: '4px 0 8px',
                      fontWeight: 500,
                    }}
                  >
                    <Building2 size={12} /> {worker.organizationName}
                  </div>
                )}
                <div className="worker-meta">
                  <span>
                    <MapPin size={14} /> {worker.scope}
                    {worker.scopeValue ? ` · ${worker.scopeValue}` : ''}
                  </span>
                  <span>
                    <UsersRound size={14} /> {worker.assignedVoters} मतदाता
                  </span>
                  <span>भूमिका · {worker.role}</span>
                </div>

                <div className="feature-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => void showAssigned(worker)}
                    disabled={isThisLoading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="इस कार्यकर्ता से जुड़े मतदाता देखें"
                  >
                    {isThisLoading ? (
                      <>
                        <LoaderCircle size={14} className="spin" /> लोड हो रहा...
                      </>
                    ) : (
                      <>
                        <UsersRound size={14} /> मतदाता सूची
                      </>
                    )}
                  </button>

                  {hasValidPhone ? (
                    <>
                      <a
                        className="button-quiet"
                        href={`tel:${worker.phone}`}
                        title={`कॉल करें: ${worker.phone}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Phone size={13} /> कॉल
                      </a>
                      <a
                        className="button-quiet"
                        href={`https://wa.me/${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        title={`WhatsApp पर चैट करें: ${worker.phone}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 600 }}
                      >
                        <WhatsAppLogo size={13} color="#16a34a" /> WhatsApp
                      </a>
                    </>
                  ) : (
                    <Link
                      className="button-quiet"
                      href="/accounts"
                      title="फोन नंबर जोड़ने के लिए खाता संपादित करें"
                      style={{ fontSize: '11px', color: '#94a3b8' }}
                    >
                      + फोन जोड़ें
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="records-panel empty-state" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <UsersRound size={36} style={{ margin: '0 auto 12px', color: '#9ca3af' }} />
          <strong>इस क्लाइंट के लिए कोई कार्यकर्ता खाता नहीं मिला</strong>
          <p style={{ margin: '6px 0 16px', color: '#6b7280' }}>
            इस चुने हुए संगठन/अभियान में अभी तक कोई फील्ड कार्यकर्ता नहीं बनाया गया है।
          </p>
          <Link
            className="button-primary"
            href="/accounts"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <UserPlus size={15} /> नया कार्यकर्ता बनाएं
          </Link>
        </div>
      )}

      {/* ================= WORKER VOTER LIST MODAL DIALOG ================= */}
      {selected && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <section
            className="form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="worker-modal-title"
            style={{
              maxWidth: '880px',
              width: '95%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '14px',
              padding: '24px',
            }}
          >
            {/* Modal Heading */}
            <div
              className="modal-heading"
              style={{
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '14px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: '#ecfdf5',
                    color: '#047857',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 800,
                    border: '1.5px solid #a7f3d0',
                  }}
                >
                  {(selected.name || selected.email).slice(0, 1).toLocaleUpperCase()}
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h2 id="worker-modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                      {selected.name || selected.email}
                    </h2>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      {selected.role}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        background: '#f0fdf4',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      📍 {selected.scope}
                      {selected.scopeValue ? ` · ${selected.scopeValue}` : ''}
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>
                    {selected.email}
                    {selected.phone && selected.phone !== '0000000000' ? ` · 📞 ${selected.phone}` : ''}
                    {selected.organizationName ? ` · 🏢 ${selected.organizationName}` : ''}
                  </p>
                </div>
              </div>

              <button
                className="icon-button"
                type="button"
                onClick={() => setSelected(null)}
                aria-label="बंद करें"
                style={{ padding: '6px', borderRadius: '8px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter & Search Bar inside Modal */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '14px',
                background: '#f8fafc',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div className="search-field" style={{ flex: '1 1 240px', background: '#ffffff' }}>
                <Search size={14} />
                <input
                  placeholder="मतदाता खोजें (नाम, EPIC, क्रमांक, मकान, भाग)..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  style={{ fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>
                  दिखाए गए: <strong style={{ color: '#0f172a' }}>{filteredModalVoters.length}</strong> मतदाता
                  {votersSource === 'scope' && selected.scopeValue && (
                    <span style={{ fontSize: '11px', color: '#047857', marginLeft: '4px' }}>
                      ({selected.scope} {selected.scopeValue} स्कोप अनुसार)
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

            {/* Content Table / Empty */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
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
                          {voter.epic || '—'}
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

            {/* Modal Footer Actions */}
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

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="button-secondary" type="button" onClick={() => setSelected(null)}>
                  बंद करें
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
