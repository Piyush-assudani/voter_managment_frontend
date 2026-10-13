'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, LoaderCircle, RefreshCw, Search, Trash2 } from 'lucide-react';
import { apiFetch, getApiError, decodeJwtPayload } from '@/lib/api';
import { downloadBlob } from '@/lib/fileDownload';

interface Dispatch {
  id: string;
  voterName: string;
  epic: string;
  phone: string;
  slipType: string;
  dispatchType?: 'whatsapp' | 'manual_whatsapp' | string;
  status: 'sent' | 'failed' | 'sending' | 'manual_link' | string;
  providerMessageId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface DispatchResponse {
  summary: { total: number; sent: number; failed: number; sending: number; manual?: number };
  dispatches: Dispatch[];
}

export default function DispatchHistoryPage() {
  const [data, setData] = useState<DispatchResponse | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (token) {
      try {
        const payload = decodeJwtPayload<{
          user?: { role?: string };
        }>(token);
        setIsAdmin(payload?.user?.role === 'admin' || payload?.user?.role === 'tenant_admin');
      } catch {}
    }
  }, []);

  const load = useCallback(async (query = search, state = status) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('search', query.trim());
      if (state) params.set('status', state);
      const response = await apiFetch(`/features/dispatches?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'Dispatch history could not be loaded.'));
      const json = await response.json() as DispatchResponse;
      setData(json);
      // Remove any selected IDs that no longer exist
      setSelectedIds((prev) => prev.filter((id) => json.dispatches.some((d) => d.id === id)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Dispatch history could not be loaded.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => { void Promise.resolve().then(() => load()); }, [load]);

  useEffect(() => {
    const handleClientChange = () => {
      void load();
    };
    window.addEventListener('client-changed', handleClientChange);
    return () => window.removeEventListener('client-changed', handleClientChange);
  }, [load]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void load(search, status);
  };

  const downloadExcel = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ dataset: 'dispatches' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      const response = await apiFetch(`/features/export.xlsx?${params}`);
      if (!response.ok) throw new Error(await getApiError(response, 'Export could not be downloaded.'));
      await downloadBlob(await response.blob(), 'dispatch-history.xlsx');
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Export could not be downloaded.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteSingle = async (id: string, voterName: string) => {
    const confirmed = window.confirm(`क्या आप ${voterName ? `मतदाता "${voterName}" का` : 'यह'} dispatch रिकॉर्ड हटाना चाहते हैं?`);
    if (!confirmed) return;

    setDeletingId(id);
    setNotice(null);
    try {
      const response = await apiFetch(`/features/dispatches/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(await getApiError(response, 'रिकॉर्ड हटाया नहीं जा सका।'));
      }
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      setNotice({ type: 'success', message: 'रिकॉर्ड सफलतापूर्वक हटा दिया गया।' });
      await load();
    } catch (err) {
      setNotice({ type: 'error', message: err instanceof Error ? err.message : 'रिकॉर्ड हटाया नहीं जा सका।' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(`क्या आप चुने गए ${selectedIds.length} dispatch रिकॉर्ड हटाना चाहते हैं?`);
    if (!confirmed) return;

    setIsBulkDeleting(true);
    setNotice(null);
    try {
      const response = await apiFetch('/features/dispatches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!response.ok) {
        throw new Error(await getApiError(response, 'रिकॉर्ड हटाए नहीं जा सके।'));
      }
      const resData = await response.json().catch(() => ({}));
      setSelectedIds([]);
      setNotice({ type: 'success', message: resData.message || `${selectedIds.length} रिकॉर्ड हटा दिए गए।` });
      await load();
    } catch (err) {
      setNotice({ type: 'error', message: err instanceof Error ? err.message : 'रिकॉर्ड हटाए नहीं जा सके।' });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleClearAll = async () => {
    const confirmed = window.confirm('क्या आप सारा dispatch इतिहास हटाना चाहते हैं?\nयह क्रिया पूर्ववत नहीं की जा सकती।');
    if (!confirmed) return;

    setIsBulkDeleting(true);
    setNotice(null);
    try {
      const response = await apiFetch('/features/dispatches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) {
        throw new Error(await getApiError(response, 'इतिहास साफ़ नहीं किया जा सका।'));
      }
      setSelectedIds([]);
      setNotice({ type: 'success', message: 'सारा dispatch इतिहास साफ़ कर दिया गया।' });
      await load();
    } catch (err) {
      setNotice({ type: 'error', message: err instanceof Error ? err.message : 'इतिहास साफ़ नहीं किया जा सका।' });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleSelectAll = () => {
    if (!data?.dispatches?.length) return;
    if (selectedIds.length === data.dispatches.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.dispatches.map((d) => d.id));
    }
  };

  const handleToggleOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  return (
    <div className="work-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow-label"><span className="eyebrow-mark" /> MESSAGE AUDIT</div>
          <h1>पर्ची भेजने का इतिहास</h1>
          <p>Meta API द्वारा स्वीकार किए गए और विफल dispatch का रिकॉर्ड। केवल वास्तविक रूप से स्वीकृत संदेश ही यहाँ गिने जाते हैं।</p>
        </div>
        <div className="feature-actions">
          <button className="button-secondary" type="button" onClick={() => void load()} disabled={loading}>
            {loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />} रिफ्रेश
          </button>
          <button className="button-secondary" type="button" onClick={() => void downloadExcel()} disabled={exporting}>
            {exporting ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />} Excel एक्सपोर्ट
          </button>
          {isAdmin && Boolean(data?.dispatches?.length) && (
            <button
              className="button-secondary"
              style={{ color: '#b91c1c', borderColor: '#fca5a5', background: '#fef2f2' }}
              type="button"
              onClick={() => void handleClearAll()}
              disabled={isBulkDeleting || loading}
            >
              {isBulkDeleting ? <LoaderCircle size={15} className="spin" /> : <Trash2 size={15} />} इतिहास साफ़ करें
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div
          className={`inline-notice ${notice.type === 'success' ? 'success-notice' : 'error-notice'}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            marginBottom: '14px',
            borderRadius: '8px',
            background: notice.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: notice.type === 'success' ? '#15803d' : '#b91c1c',
            border: `1px solid ${notice.type === 'success' ? '#bbf7d0' : '#fecaca'}`
          }}
          role="alert"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
            {notice.type === 'success' ? <CheckCircle2 size={16} /> : null}
            {notice.message}
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {error && <div className="inline-notice error-notice" role="alert">{error}</div>}

      <section className="feature-metrics">
        <article className="metric-card">
          <span>कुल प्रयास</span>
          <strong>{data?.summary.total ?? '—'}</strong>
          <small>रिकॉर्ड किए dispatch</small>
        </article>
        <article className="metric-card metric-card-green">
          <span>Meta ने स्वीकारे</span>
          <strong>{data?.summary.sent ?? '—'}</strong>
          <small>वास्तविक भेजे गए संदेश</small>
        </article>
        <article className="metric-card">
          <span>विफल</span>
          <strong>{data?.summary.failed ?? '—'}</strong>
          <small>Meta send errors</small>
        </article>
        <article className="metric-card">
          <span>प्रोसेस में</span>
          <strong>{data?.summary.sending ?? '—'}</strong>
          <small>Webhook receipts प्रतीक्षित</small>
        </article>
        {(data?.summary.manual ?? 0) > 0 && (
          <article className="metric-card" style={{ borderColor: '#cbd5e1' }}>
            <span>मैनुअल लिंक</span>
            <strong>{data?.summary.manual}</strong>
            <small>wa.me ब्राउज़र लिंक</small>
          </article>
        )}
      </section>

      <section className="records-panel">
        <div className="records-toolbar">
          <div>
            <h2>Dispatch रिकॉर्ड</h2>
            <p>नाम, EPIC या फोन नंबर से खोजें।</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {isAdmin && selectedIds.length > 0 && (
              <button
                className="button-secondary"
                style={{ color: '#b91c1c', borderColor: '#fca5a5', background: '#fef2f2', fontWeight: 500 }}
                type="button"
                onClick={() => void handleBulkDelete()}
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? <LoaderCircle size={15} className="spin" /> : <Trash2 size={15} />}
                चुने गए हटाएं ({selectedIds.length})
              </button>
            )}
            <form className="feature-filter-form" onSubmit={submit}>
              <label className="search-field">
                <Search size={15} />
                <input
                  aria-label="Dispatch खोजें"
                  placeholder="नाम, EPIC, फोन"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <select
                aria-label="स्थिति"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  void load(search, event.target.value);
                }}
              >
                <option value="">सभी स्थिति</option>
                <option value="sent">स्वीकारा गया (Meta API)</option>
                <option value="manual_link">मैनुअल लिंक (wa.me)</option>
                <option value="failed">विफल</option>
                <option value="sending">प्रोसेस में</option>
              </select>
            </form>
          </div>
        </div>

        {loading && !data ? (
          <div className="empty-state">
            <LoaderCircle size={20} className="spin" />
            <p>इतिहास लोड हो रहा है…</p>
          </div>
        ) : data?.dispatches?.length ? (
          <div className="table-scroll">
            <table className="voter-table desk-table">
              <thead>
                <tr>
                  {isAdmin && (
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        aria-label="सभी चुनें"
                        checked={Boolean(data.dispatches.length && selectedIds.length === data.dispatches.length)}
                        onChange={handleSelectAll}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </th>
                  )}
                  <th>समय</th>
                  <th>मतदाता</th>
                  <th>EPIC</th>
                  <th>फोन</th>
                  <th>पर्ची</th>
                  <th>माध्यम</th>
                  <th>स्थिति</th>
                  {isAdmin && <th style={{ textAlign: 'center', width: '90px' }}>एक्शन</th>}
                </tr>
              </thead>
              <tbody>
                {data.dispatches.map((item) => {
                  const isManual = item.dispatchType === 'manual_whatsapp' || item.status === 'manual_link';
                  const isSent = item.status === 'sent' && !isManual;
                  const isFailed = item.status === 'failed';

                  return (
                    <tr key={item.id} style={{ background: selectedIds.includes(item.id) ? '#f8fafc' : undefined }}>
                      {isAdmin && (
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            aria-label={`चुनें ${item.voterName || item.epic}`}
                            checked={selectedIds.includes(item.id)}
                            onChange={() => handleToggleOne(item.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                      )}
                      <td>{new Date(item.createdAt).toLocaleString('hi-IN')}</td>
                      <td>
                        <div className="voter-name">{item.voterName || '—'}</div>
                        {item.errorMessage && (
                          <div className="voter-subline" style={{ color: '#dc2626', fontSize: '0.75rem' }}>
                            {item.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="voter-code">{item.epic || '—'}</td>
                      <td>{item.phone}</td>
                      <td>{item.slipType === 'family' ? 'परिवार' : 'व्यक्तिगत'}</td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontSize: '0.78rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: isManual ? '#f1f5f9' : '#e0f2fe',
                            color: isManual ? '#475569' : '#0369a1',
                            fontWeight: 500,
                          }}
                        >
                          {isManual ? 'मैनुअल लिंक' : 'Meta API'}
                        </span>
                      </td>
                      <td>
                        {isManual ? (
                          <div>
                            <span className="record-status" style={{ background: '#f8fafc', color: '#64748b', borderColor: '#e2e8f0' }}>
                              मैनुअल लिंक
                            </span>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>wa.me चैट लिंक</div>
                          </div>
                        ) : isSent ? (
                          <div>
                            <span className="record-status status-voted">स्वीकारा गया</span>
                            {item.providerMessageId && (
                              <div style={{ fontSize: '0.68rem', color: '#16a34a', marginTop: '2px', fontFamily: 'monospace' }} title={item.providerMessageId}>
                                ID: {item.providerMessageId.slice(0, 14)}…
                              </div>
                            )}
                          </div>
                        ) : isFailed ? (
                          <span className="record-status status-pending">विफल</span>
                        ) : (
                          <span className="record-status">भेजा जा रहा है</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            disabled={deletingId === item.id || isBulkDeleting}
                            onClick={() => void handleDeleteSingle(item.id, item.voterName)}
                            title="यह रिकॉर्ड हटाएं"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: '#fef2f2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              fontSize: '0.76rem',
                              cursor: 'pointer',
                              fontWeight: 500,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {deletingId === item.id ? <LoaderCircle size={12} className="spin" /> : <Trash2 size={12} />}
                            <span>हटाएं</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <strong>{loading ? 'लोड हो रहा है…' : 'अभी कोई dispatch रिकॉर्ड नहीं'}</strong>
            <p>वास्तविक WhatsApp send attempts यहाँ दिखेंगे।</p>
          </div>
        )}
        <div className="records-footnote">
          संदेश भेजने का इतिहास Meta API response पर आधारित है; sent का अर्थ delivery या read confirmation नहीं है।
        </div>
      </section>
    </div>
  );
}

