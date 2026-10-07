'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Download, LoaderCircle, RefreshCw, Search } from 'lucide-react';
import { apiFetch, getApiError } from '@/lib/api';

interface Dispatch {
  id: number;
  voterName: string;
  epic: string;
  phone: string;
  slipType: string;
  status: 'sent' | 'failed' | 'sending';
  providerMessageId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface DispatchResponse {
  summary: { total: number; sent: number; failed: number; sending: number };
  dispatches: Dispatch[];
}

export default function DispatchHistoryPage() {
  const [data, setData] = useState<DispatchResponse | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (query = search, state = status) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('search', query.trim());
      if (state) params.set('status', state);
      const response = await apiFetch(`/features/dispatches?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'Dispatch history could not be loaded.'));
      setData(await response.json() as DispatchResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Dispatch history could not be loaded.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => { void Promise.resolve().then(() => load()); }, [load]);

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
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'dispatch-history.xlsx';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Export could not be downloaded.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="work-page">
      <div className="page-intro">
        <div><div className="eyebrow-label"><span className="eyebrow-mark" /> MESSAGE AUDIT</div><h1>पर्ची भेजने का इतिहास</h1><p>Meta API द्वारा स्वीकार किए गए और विफल dispatch का रिकॉर्ड। Delivery/read receipt तभी दिखेंगे जब webhook जोड़ा जाएगा।</p></div>
        <div className="feature-actions">
          <button className="button-secondary" type="button" onClick={() => void load()} disabled={loading}>{loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />} रिफ्रेश</button>
          <button className="button-secondary" type="button" onClick={() => void downloadExcel()} disabled={exporting}>{exporting ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />} Excel एक्सपोर्ट</button>
        </div>
      </div>

      {error && <div className="inline-notice error-notice" role="alert">{error}</div>}
      <section className="feature-metrics">
        <article className="metric-card"><span>कुल प्रयास</span><strong>{data?.summary.total ?? '—'}</strong><small>रिकॉर्ड किए dispatch</small></article>
        <article className="metric-card metric-card-green"><span>Meta ने स्वीकारे</span><strong>{data?.summary.sent ?? '—'}</strong><small>भेजे गए संदेश</small></article>
        <article className="metric-card"><span>विफल</span><strong>{data?.summary.failed ?? '—'}</strong><small>Meta send errors</small></article>
        <article className="metric-card"><span>प्रोसेस में</span><strong>{data?.summary.sending ?? '—'}</strong><small>Webhook receipts उपलब्ध नहीं</small></article>
      </section>

      <section className="records-panel">
        <div className="records-toolbar">
          <div><h2>Dispatch रिकॉर्ड</h2><p>नाम, EPIC या फोन नंबर से खोजें।</p></div>
          <form className="feature-filter-form" onSubmit={submit}>
            <label className="search-field"><Search size={15} /><input aria-label="Dispatch खोजें" placeholder="नाम, EPIC, फोन" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            <select aria-label="स्थिति" value={status} onChange={(event) => { setStatus(event.target.value); void load(search, event.target.value); }}>
              <option value="">सभी स्थिति</option><option value="sent">भेजा</option><option value="failed">विफल</option><option value="sending">प्रोसेस में</option>
            </select>
          </form>
        </div>
        {loading && !data ? <div className="empty-state"><LoaderCircle size={20} className="spin" /><p>इतिहास लोड हो रहा है…</p></div> : data?.dispatches.length ? (
          <div className="table-scroll"><table className="voter-table desk-table"><thead><tr><th>समय</th><th>मतदाता</th><th>EPIC</th><th>फोन</th><th>पर्ची</th><th>स्थिति</th></tr></thead><tbody>
            {data.dispatches.map((item) => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString('hi-IN')}</td><td><div className="voter-name">{item.voterName || '—'}</div>{item.errorMessage && <div className="voter-subline">{item.errorMessage}</div>}</td><td className="voter-code">{item.epic || '—'}</td><td>{item.phone}</td><td>{item.slipType === 'family' ? 'परिवार' : 'व्यक्तिगत'}</td><td><span className={`record-status ${item.status === 'sent' ? 'status-voted' : item.status === 'failed' ? 'status-pending' : ''}`}>{item.status === 'sent' ? 'स्वीकारा गया' : item.status === 'failed' ? 'विफल' : 'भेजा जा रहा है'}</span></td></tr>)}
          </tbody></table></div>
        ) : <div className="empty-state"><strong>{loading ? 'लोड हो रहा है…' : 'अभी कोई dispatch रिकॉर्ड नहीं'}</strong><p>वास्तविक WhatsApp send attempts यहाँ दिखेंगे।</p></div>}
        <div className="records-footnote">संदेश भेजने का इतिहास Meta API response पर आधारित है; sent का अर्थ delivery या read confirmation नहीं है।</div>
      </section>
    </div>
  );
}
