'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Download, LoaderCircle, RefreshCw, Search, Trash2 } from 'lucide-react';
import { apiFetch, getApiError, decodeJwtPayload } from '@/lib/api';
import { downloadBlob } from '@/lib/fileDownload';
import { toast } from '@/components/Toast';
import { useRealtimeEvents } from '@/lib/socket';

interface Dispatch {
  id: string;
  voterName: string;
  epic: string;
  phone: string;
  slipType: string;
  dispatchType?: 'whatsapp' | 'manual_whatsapp' | string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'sending' | 'manual_link' | string;
  deliveredAt?: string | null;
  readAt?: string | null;
  providerMessageId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface DispatchResponse {
  summary: { total: number; sent: number; delivered?: number; read?: number; failed: number; sending: number; manual?: number };
  dispatches: Dispatch[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

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

  const load = useCallback(async (query = search, state = status, page = currentPage) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('search', query.trim());
      if (state) params.set('status', state);
      params.set('page', String(page));
      params.set('limit', String(pageSize));
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
  }, [search, status, currentPage]);

  useEffect(() => { void Promise.resolve().then(() => load(search, status, currentPage)); }, [load, currentPage]);

  useEffect(() => {
    const handleClientChange = () => {
      void load();
    };
    window.addEventListener('client-changed', handleClientChange);
    return () => window.removeEventListener('client-changed', handleClientChange);
  }, [load]);

  const dispatchRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (dispatchRefreshTimerRef.current) clearTimeout(dispatchRefreshTimerRef.current);
    };
  }, []);

  useRealtimeEvents({
    'dispatch:updated': (evt) => {
      setData((cur) => {
        if (!cur) return cur;
        return {
          ...cur,
          dispatches: cur.dispatches.map((d) =>
            d.id === evt.dispatchId ? { ...d, status: evt.status } : d
          ),
        };
      });
      if (dispatchRefreshTimerRef.current) clearTimeout(dispatchRefreshTimerRef.current);
      dispatchRefreshTimerRef.current = setTimeout(() => {
        void load(search, status, currentPage);
      }, 800);
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCurrentPage(1);
    void load(search, status, 1);
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
      toast.success('Dispatch इतिहास Excel डाउनलोड हो गया।');
    } catch (downloadError) {
      const msg = downloadError instanceof Error ? downloadError.message : 'Export could not be downloaded.';
      setError(msg);
      toast.error(msg);
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
      toast.success('रिकॉर्ड सफलतापूर्वक हटा दिया गया।');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'रिकॉर्ड हटाया नहीं जा सका।';
      setNotice({ type: 'error', message: msg });
      toast.error(msg);
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
      const msg = resData.message || `${selectedIds.length} रिकॉर्ड हटा दिए गए।`;
      setSelectedIds([]);
      setNotice({ type: 'success', message: msg });
      toast.success(msg);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'रिकॉर्ड हटाए नहीं जा सके।';
      setNotice({ type: 'error', message: msg });
      toast.error(msg);
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
      toast.success('सारा dispatch इतिहास साफ़ कर दिया गया।');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'इतिहास साफ़ नहीं किया जा सका।';
      setNotice({ type: 'error', message: msg });
      toast.error(msg);
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
          {isAdmin && (
            <button className="button-secondary" type="button" onClick={() => void downloadExcel()} disabled={exporting}>
              {exporting ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />} Excel एक्सपोर्ट
            </button>
          )}
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
          <span>✅ डिलीवर हुआ</span>
          <strong>{data?.summary.delivered ?? 0}</strong>
          <small>हैंडसेट पर प्राप्त संदेश</small>
        </article>
        <article className="metric-card" style={{ borderColor: '#fed7aa', background: '#fff7ed' }}>
          <span style={{ color: '#c2410c' }}>⏳ कतार / होल्ड</span>
          <strong style={{ color: '#c2410c' }}>{data?.summary.sent ?? 0}</strong>
          <small style={{ color: '#ea580c' }}>Meta स्वीकार; हैंडसेट लंबित</small>
        </article>
        <article className="metric-card metric-card-rose">
          <span>❌ विफल</span>
          <strong>{data?.summary.failed ?? '—'}</strong>
          <small>Meta रिजेक्ट / एरर</small>
        </article>
        {(data?.summary.manual ?? 0) > 0 && (
          <article className="metric-card" style={{ borderColor: '#cbd5e1' }}>
            <span>🔗 मैनुअल लिंक</span>
            <strong>{data?.summary.manual}</strong>
            <small>wa.me ब्राउज़र लिंक</small>
          </article>
        )}
      </section>

      <section className="records-panel">
        <div
          style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            fontSize: '0.85rem',
            color: '#0369a1',
            lineHeight: '1.5'
          }}
        >
          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>💡</span>
          <div>
            <strong style={{ color: '#0c4a6e', display: 'block', marginBottom: '2px' }}>
              Meta WhatsApp डिलीवरी स्थिति एवं पॉलिसी नियम:
            </strong>
            Meta Business WhatsApp की सख्त मार्केटिंग नीतियां (Marketing Frequency Capping) होती हैं। यदि टेस्टिंग के दौरान <b>एक ही फोन नंबर पर बार-बार</b> पर्ची भेजी जाती है, तो पहली पर्ची तुरंत पहुंचती है, लेकिन बाद के संदेश Meta द्वारा कुछ घंटों के लिए होल्ड/सप्रेस कर दिए जाते हैं। वास्तविक चुनाव में प्रत्येक मतदाता का <b>अलग फोन नंबर</b> होता है, जिससे सभी मतदाताओं को पर्ची तुरंत डिलीवर होती है।
          </div>
        </div>

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
                <option value="delivered">✅ डिलीवर हुआ (हैंडसेट)</option>
                <option value="sent">⏳ Meta कतार / होल्ड</option>
                <option value="manual_link">🔗 मैनुअल लिंक (wa.me)</option>
                <option value="failed">❌ विफल (नहीं गया)</option>
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
                        {(() => {
                          if (isManual) {
                            return (
                              <div>
                                <span className="record-status" style={{ background: '#f8fafc', color: '#64748b', borderColor: '#e2e8f0' }}>
                                  🔗 मैनुअल लिंक
                                </span>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>wa.me चैट लिंक</div>
                              </div>
                            );
                          }

                          if (isFailed) {
                            return (
                              <div>
                                <span className="record-status status-pending" style={{ background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}>
                                  ❌ विफल (नहीं गया)
                                </span>
                                {item.errorMessage && (
                                  <div style={{ fontSize: '0.68rem', color: '#b91c1c', marginTop: '3px', maxWidth: '230px', lineHeight: '1.25' }} title={item.errorMessage}>
                                    {item.errorMessage}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          const isRead = item.status === 'read' || Boolean(item.readAt);
                          if (isRead) {
                            return (
                              <div>
                                <span className="record-status" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>
                                  👁️ पढ़ा गया (Blue Tick)
                                </span>
                                <div style={{ fontSize: '0.68rem', color: '#0284c7', marginTop: '2px' }}>
                                  {item.readAt ? `देखा: ${new Date(item.readAt).toLocaleTimeString('hi-IN')}` : 'मतदाता द्वारा देखा गया'}
                                </div>
                              </div>
                            );
                          }

                          const isDelivered = item.status === 'delivered' || Boolean(item.deliveredAt);
                          if (isDelivered) {
                            return (
                              <div>
                                <span className="record-status status-voted" style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}>
                                  ✅ डिलीवर हुआ (Double Tick)
                                </span>
                                <div style={{ fontSize: '0.68rem', color: '#059669', marginTop: '2px' }}>
                                  {item.deliveredAt ? `प्राप्त: ${new Date(item.deliveredAt).toLocaleTimeString('hi-IN')}` : 'हैंडसेट पर प्राप्त'}
                                </div>
                              </div>
                            );
                          }

                          if (isSent) {
                            const ageMs = Date.now() - new Date(item.createdAt).getTime();
                            const isOld = ageMs > 3 * 60 * 1000;

                            if (isOld) {
                              return (
                                <div>
                                  <span
                                    className="record-status"
                                    style={{
                                      background: '#fff7ed',
                                      color: '#c2410c',
                                      borderColor: '#fed7aa',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                  >
                                    ⚠️ Meta द्वारा होल्ड/सप्रेस्ड
                                  </span>
                                  <div style={{ fontSize: '0.68rem', color: '#9a3412', marginTop: '3px', maxWidth: '240px', lineHeight: '1.25' }}>
                                    Meta API ने स्वीकारा, पर फोन पर नहीं पहुंचा।
                                    <span style={{ display: 'block', color: '#ea580c', fontWeight: 500 }}>
                                      (समान नंबर पर बार-बार मार्केटिंग संदेश भेजने पर Meta होल्ड कर देता है)
                                    </span>
                                  </div>
                                  {item.providerMessageId && (
                                    <div style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: '2px', fontFamily: 'monospace' }} title={item.providerMessageId}>
                                      ID: {item.providerMessageId.slice(0, 14)}…
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div>
                                <span
                                  className="record-status"
                                  style={{
                                    background: '#fefce8',
                                    color: '#a16207',
                                    borderColor: '#fef08a',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  ⏳ Meta कतार (वितरण प्रतीक्षित)
                                </span>
                                <div style={{ fontSize: '0.68rem', color: '#854d0e', marginTop: '2px' }}>
                                  Meta द्वारा स्वीकार; फोन पर डिलीवरी प्रतीक्षारत…
                                </div>
                                {item.providerMessageId && (
                                  <div style={{ fontSize: '0.65rem', color: '#a3a3a3', marginTop: '2px', fontFamily: 'monospace' }} title={item.providerMessageId}>
                                    ID: {item.providerMessageId.slice(0, 14)}…
                                  </div>
                                )}
                              </div>
                            );
                          }

                          return (
                            <span className="record-status" style={{ background: '#f5f3ff', color: '#6d28d9', borderColor: '#ddd6fe' }}>
                              🔄 भेजा जा रहा है
                            </span>
                          );
                        })()}
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

        {/* Pagination Bar */}
        {data && data.pagination && data.pagination.totalPages > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            borderRadius: '0 0 10px 10px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              कुल <strong>{data.pagination.total.toLocaleString('hi-IN')}</strong> में से <strong>{((data.pagination.page - 1) * data.pagination.limit + 1).toLocaleString('hi-IN')}</strong> - <strong>{Math.min(data.pagination.page * data.pagination.limit, data.pagination.total).toLocaleString('hi-IN')}</strong> रिकॉर्ड्स (पेज {data.pagination.page} / {data.pagination.totalPages})
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
                  color: currentPage <= 1 ? '#94a3b8' : '#0f172a',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <ChevronLeft size={16} /> पिछला
              </button>
              <button
                type="button"
                disabled={currentPage >= (data.pagination.totalPages || 1) || loading}
                onClick={() => setCurrentPage((p) => Math.min(data.pagination?.totalPages || 1, p + 1))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: currentPage >= (data.pagination.totalPages || 1) ? '#f1f5f9' : '#ffffff',
                  color: currentPage >= (data.pagination.totalPages || 1) ? '#94a3b8' : '#0f172a',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: currentPage >= (data.pagination.totalPages || 1) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                अगला <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="records-footnote">
          संदेश भेजने का इतिहास Meta API response पर आधारित है; sent का अर्थ delivery या read confirmation नहीं है।
        </div>
      </section>
    </div>
  );
}

