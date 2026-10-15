'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  LoaderCircle,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { apiFetch, decodeJwtPayload, getApiError } from '@/lib/api';
import { downloadBlob } from '@/lib/fileDownload';

interface Voter {
  _id: string;
  nameHi: string;
  nameEn: string;
  wardNo: string;
  partNo: string;
  serialNo: number;
  gender: string;
  voted: boolean;
  phone: string;
  supportStatus: string;
}

interface WardSummary {
  name: string;
  total: number;
  voted: number;
}

interface TurnoutSummaryData {
  totalVoters: number;
  totalVoted: number;
  remaining: number;
  turnout: number;
  maleVoted: number;
  femaleVoted: number;
  wardSummaries: WardSummary[];
  updatedAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export default function TurnoutPage() {
  const [summary, setSummary] = useState<TurnoutSummaryData | null>(null);
  const [pendingVoters, setPendingVoters] = useState<Voter[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingWard, setPendingWard] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [savingId, setSavingId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (token) {
      try {
        const payload = decodeJwtPayload<{ user?: { role?: string } }>(token);
        setIsAdmin(payload?.user?.role === 'admin');
      } catch {}
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const response = await apiFetch('/voters/turnout-summary', { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'मतदान सारांश लोड नहीं हुआ।'));
      const data = (await response.json()) as TurnoutSummaryData;
      setSummary(data);
      setUpdatedAt(new Date(data.updatedAt || Date.now()));
      return data;
    } catch (err) {
      console.error('Turnout summary error:', err);
      throw err;
    }
  }, []);

  const loadPendingVoters = useCallback(async (page: number, ward: string) => {
    setPendingLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
      });
      if (ward) params.set('ward', ward);

      const response = await apiFetch(`/voters/turnout-pending?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'बाकी मतदाता सूची लोड नहीं हुई।'));
      const data = (await response.json()) as { voters: Voter[]; pagination: PaginationData };
      setPendingVoters(data.voters || []);
      setPagination(
        data.pagination || {
          page,
          limit: 50,
          total: data.voters?.length || 0,
          totalPages: 1,
          hasPrev: false,
          hasNext: false,
        }
      );
    } catch (err) {
      console.error('Pending voters error:', err);
      throw err;
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadSummary(), loadPendingVoters(currentPage, pendingWard)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'मतदान आँकड़े लोड नहीं हुए।');
    } finally {
      setLoading(false);
    }
  }, [loadSummary, loadPendingVoters, currentPage, pendingWard]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const handleClientChange = () => {
      setCurrentPage(1);
      void loadAll();
    };
    window.addEventListener('client-changed', handleClientChange);
    return () => window.removeEventListener('client-changed', handleClientChange);
  }, [loadAll]);

  const handleWardChange = (ward: string) => {
    setPendingWard(ward);
    setCurrentPage(1);
    void loadPendingVoters(1, ward);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    void loadPendingVoters(newPage, pendingWard);
  };

  const markVoted = async (voter: Voter) => {
    setSavingId(voter._id);
    setError('');
    try {
      const response = await apiFetch(`/voters/${encodeURIComponent(voter._id)}/vote`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voted: true }),
      });
      if (!response.ok) throw new Error(await getApiError(response, 'मतदान स्थिति अपडेट नहीं हुई।'));

      // Optimistic update for immediate responsiveness
      setPendingVoters((current) => current.filter((item) => item._id !== voter._id));
      setPagination((prev) => {
        const newTotal = Math.max(0, prev.total - 1);
        return {
          ...prev,
          total: newTotal,
          totalPages: Math.max(1, Math.ceil(newTotal / prev.limit)),
        };
      });

      setSummary((prev) => {
        if (!prev) return prev;
        const newVoted = prev.totalVoted + 1;
        const newRemaining = Math.max(0, prev.remaining - 1);
        const isMale = ['पुरुष', 'Male', 'M'].includes(voter.gender);
        const isFemale = ['स्त्री', 'महिला', 'Female', 'F'].includes(voter.gender);
        const newWardSummaries = prev.wardSummaries.map((w) =>
          w.name === voter.wardNo ? { ...w, voted: w.voted + 1 } : w
        );
        return {
          ...prev,
          totalVoted: newVoted,
          remaining: newRemaining,
          turnout: prev.totalVoters ? Math.round((newVoted / prev.totalVoters) * 100) : 0,
          maleVoted: isMale ? prev.maleVoted + 1 : prev.maleVoted,
          femaleVoted: isFemale ? prev.femaleVoted + 1 : prev.femaleVoted,
          wardSummaries: newWardSummaries,
        };
      });

      // Background re-fetch to synchronize state
      void loadSummary();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'मतदान स्थिति अपडेट नहीं हुई।');
    } finally {
      setSavingId('');
    }
  };

  const exportPending = async () => {
    setExporting(true);
    setError('');
    try {
      const params = new URLSearchParams({ dataset: 'turnout' });
      if (pendingWard) params.set('ward', pendingWard);
      const response = await apiFetch(`/features/export.xlsx?${params.toString()}`);
      if (!response.ok) throw new Error(await getApiError(response, 'Excel एक्सपोर्ट नहीं हो सका।'));
      await downloadBlob(
        await response.blob(),
        `pending-voters${pendingWard ? `-ward-${pendingWard}` : ''}.xlsx`
      );
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Excel एक्सपोर्ट नहीं हो सका।');
    } finally {
      setExporting(false);
    }
  };

  const wardSummaries = summary?.wardSummaries || [];
  const totalVoters = summary?.totalVoters ?? 0;
  const totalVoted = summary?.totalVoted ?? 0;
  const remaining = summary?.remaining ?? 0;
  const turnout = summary?.turnout ?? 0;
  const maleVoted = summary?.maleVoted ?? 0;
  const femaleVoted = summary?.femaleVoted ?? 0;

  return (
    <div className="work-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow-label">
            <span className="eyebrow-mark" /> TURNOUT OVERVIEW
          </div>
          <h1>मतदान स्थिति</h1>
          <p>मतदान की स्थिति का डेटाबेस-आधारित सारांश। डेटा रियल-टाइम नहीं है—आख़िरी अपडेट का समय नीचे है।</p>
        </div>
        <button className="button-secondary" type="button" onClick={() => void loadAll()} disabled={loading}>
          {loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}
          रिफ्रेश
        </button>
      </div>

      {error && (
        <div className="inline-notice error-notice" role="alert">
          {error}
        </div>
      )}

      {loading && !summary ? (
        <div className="records-panel empty-state">
          <LoaderCircle size={21} className="spin" />
          <p>डेटाबेस से मतदान रिकॉर्ड लोड हो रहे हैं…</p>
        </div>
      ) : error && !summary ? (
        <div className="records-panel empty-state error-state">
          <strong>आँकड़े उपलब्ध नहीं हैं</strong>
          <p>{error}</p>
          <button className="button-secondary" type="button" onClick={() => void loadAll()}>
            फिर से कोशिश करें
          </button>
        </div>
      ) : (
        <>
          <section className="turnout-overview">
            <div className="turnout-main">
              <div className="turnout-main-heading">
                <span>कुल मतदान प्रगति</span>
                <span suppressHydrationWarning>
                  {mounted && updatedAt
                    ? `अपडेट ${updatedAt.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}`
                    : '—'}
                </span>
              </div>
              <div className="turnout-number">{loading ? '—' : `${turnout}%`}</div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${turnout}%` }} />
              </div>
              <div className="turnout-caption">
                <span>{totalVoted.toLocaleString('hi-IN')} मतदान दर्ज</span>
                <span>{remaining.toLocaleString('hi-IN')} शेष</span>
              </div>
            </div>
            <div className="turnout-side-metrics">
              <div>
                <span>कुल मतदाता</span>
                <strong>{totalVoters.toLocaleString('hi-IN')}</strong>
              </div>
              <div>
                <span>पुरुष मतदाता · मतदान किया</span>
                <strong>{maleVoted.toLocaleString('hi-IN')}</strong>
              </div>
              <div>
                <span>महिला मतदाता · मतदान किया</span>
                <strong>{femaleVoted.toLocaleString('hi-IN')}</strong>
              </div>
            </div>
          </section>

          <div className="section-title-row">
            <div>
              <h2>वार्ड के अनुसार</h2>
              <p>दर्ज रिकॉर्ड पर आधारित तुलना</p>
            </div>
            <span className="panel-count">{wardSummaries.length} वार्ड</span>
          </div>
          <section className="ward-grid">
            {wardSummaries.map((ward) => {
              const percent = ward.total ? Math.round((ward.voted / ward.total) * 100) : 0;
              const formattedWard = /^(वार्ड|Ward)\s*/i.test(ward.name) ? ward.name : `वार्ड ${ward.name}`;
              return (
                <article className="ward-card" key={ward.name}>
                  <div className="ward-card-heading">
                    <strong style={{ fontSize: '14px', fontWeight: 650, color: '#1e293b' }}>
                      {formattedWard}
                    </strong>
                    <span>{percent}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="ward-card-caption">
                    <span>{ward.voted.toLocaleString('hi-IN')} मतदान दर्ज</span>
                    <span>{ward.total.toLocaleString('hi-IN')} मतदाता</span>
                  </div>
                </article>
              );
            })}
            {!wardSummaries.length && (
              <div className="records-panel empty-state">
                <strong>कोई रिकॉर्ड नहीं</strong>
                <p>डेटाबेस में अभी मतदाता रिकॉर्ड नहीं हैं।</p>
              </div>
            )}
          </section>

          <section className="records-panel turnout-pending">
            <div className="records-toolbar">
              <div>
                <h2>बाकी मतदाता · संपर्क सूची</h2>
                <p>
                  {pendingLoading ? (
                    'लोड हो रहा है…'
                  ) : (
                    <>
                      {pendingVoters.length} रिकॉर्ड दिखाए गए (पेज {pagination.page} / {pagination.totalPages}); कुल{' '}
                      <strong>{pagination.total.toLocaleString('hi-IN')}</strong> शेष।
                    </>
                  )}
                </p>
              </div>
              <div className="feature-actions">
                <select
                  aria-label="शेष मतदाता का वार्ड फ़िल्टर"
                  value={pendingWard}
                  onChange={(event) => handleWardChange(event.target.value)}
                >
                  <option value="">सभी वार्ड</option>
                  {wardSummaries.map((ward) => (
                    <option key={ward.name} value={ward.name}>
                      {/^(वार्ड|Ward)\s*/i.test(ward.name) ? ward.name : `वार्ड ${ward.name}`}
                    </option>
                  ))}
                </select>
                {isAdmin && (
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => void exportPending()}
                    disabled={!pagination.total || exporting}
                  >
                    {exporting ? <LoaderCircle size={14} className="spin" /> : <Download size={14} />} सूची Excel
                  </button>
                )}
              </div>
            </div>

            {pendingLoading ? (
              <div className="empty-state" style={{ minHeight: '180px' }}>
                <LoaderCircle size={20} className="spin" />
                <p>मतदाताओं की सूची लोड हो रही है…</p>
              </div>
            ) : pendingVoters.length ? (
              <>
                <div className="table-scroll">
                  <table className="voter-table desk-table">
                    <thead>
                      <tr>
                        <th>मतदाता</th>
                        <th>क्षेत्र</th>
                        <th>क्रमांक</th>
                        <th>संपर्क</th>
                        <th>कार्य</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingVoters.map((voter) => (
                        <tr key={voter._id}>
                          <td>
                            <div className="voter-name">{voter.nameHi || voter.nameEn || '—'}</div>
                          </td>
                          <td className="voter-code">
                            {voter.wardNo || '—'} · {voter.partNo || '—'}
                          </td>
                          <td className="voter-code">{voter.serialNo || '—'}</td>
                          <td>
                            {voter.phone ? (
                              <a className="button-quiet" href={`tel:${voter.phone}`}>
                                <Phone size={14} /> {voter.phone}
                              </a>
                            ) : (
                              'फोन दर्ज नहीं'
                            )}
                          </td>
                          <td>
                            <button
                              className="button-secondary vote-button is-checked"
                              type="button"
                              onClick={() => void markVoted(voter)}
                              disabled={savingId === voter._id}
                            >
                              {savingId === voter._id ? (
                                <LoaderCircle size={14} className="spin" />
                              ) : (
                                <Check size={14} />
                              )}{' '}
                              मतदान दर्ज करें
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Turnout Pending Voters Pagination Bar */}
                {pagination.totalPages > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 18px',
                      borderTop: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      दिखाए जा रहे हैं:{' '}
                      <strong>{((currentPage - 1) * pagination.limit + 1).toLocaleString('hi-IN')}</strong> -{' '}
                      <strong>
                        {Math.min(currentPage * pagination.limit, pagination.total).toLocaleString('hi-IN')}
                      </strong>{' '}
                      (कुल <strong>{pagination.total.toLocaleString('hi-IN')}</strong> शेष मतदाता)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        disabled={currentPage <= 1 || pendingLoading}
                        onClick={() => handlePageChange(1)}
                        title="पहला पेज"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: currentPage <= 1 ? '#e2e8f0' : '#ffffff',
                          color: currentPage <= 1 ? '#94a3b8' : '#0f172a',
                          cursor: currentPage <= 1 || pendingLoading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <ChevronsLeft size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={currentPage <= 1 || pendingLoading}
                        onClick={() => handlePageChange(currentPage - 1)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: currentPage <= 1 ? '#e2e8f0' : '#ffffff',
                          color: currentPage <= 1 ? '#94a3b8' : '#0f172a',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: currentPage <= 1 || pendingLoading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <ChevronLeft size={15} /> पिछला
                      </button>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155', padding: '0 8px' }}>
                        पेज {currentPage} / {pagination.totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage >= pagination.totalPages || pendingLoading}
                        onClick={() => handlePageChange(currentPage + 1)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: currentPage >= pagination.totalPages ? '#e2e8f0' : '#ffffff',
                          color: currentPage >= pagination.totalPages ? '#94a3b8' : '#0f172a',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: currentPage >= pagination.totalPages || pendingLoading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        अगला <ChevronRight size={15} />
                      </button>
                      <button
                        type="button"
                        disabled={currentPage >= pagination.totalPages || pendingLoading}
                        onClick={() => handlePageChange(pagination.totalPages)}
                        title="आखिरी पेज"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: currentPage >= pagination.totalPages ? '#e2e8f0' : '#ffffff',
                          color: currentPage >= pagination.totalPages ? '#94a3b8' : '#0f172a',
                          cursor: currentPage >= pagination.totalPages || pendingLoading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <ChevronsRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <strong>सभी उपलब्ध रिकॉर्ड अपडेट हैं</strong>
                <p>इस समय मतदान के लिए शेष मतदाता नहीं हैं।</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
