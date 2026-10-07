'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoaderCircle, RefreshCw, UsersRound } from 'lucide-react';
import { apiFetch, getApiError } from '@/lib/api';

type SupportStatus = 'core' | 'swing' | 'opposition' | 'unmarked';

interface SupportCount {
  status: SupportStatus;
  count: number;
}

interface BoothSummary {
  ward: string;
  part: string;
  total: number;
  voted: number;
  core: number;
  swing: number;
  opposition: number;
  unmarked: number;
}

interface WarRoomData {
  support: SupportCount[];
  booths: BoothSummary[];
}

interface Organization {
  id: string;
  name: string;
}

const supportLabels: Record<SupportStatus, string> = {
  core: 'समर्थन चिह्नित',
  swing: 'अनिर्णीत चिह्नित',
  opposition: 'विरोध चिह्नित',
  unmarked: 'अवर्गीकृत',
};

export default function WarroomPage() {
  const [data, setData] = useState<WarRoomData | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [baseline, setBaseline] = useState(78);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
      const response = await apiFetch(`/features/war-room${query}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'वॉर रूम डेटा लोड नहीं हुआ।'));
      setData(await response.json() as WarRoomData);
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof Error ? loadError.message : 'वॉर रूम डेटा लोड नहीं हुआ।');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { void Promise.resolve().then(() => loadData()); }, [loadData]);

  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        const token = window.localStorage.getItem('token');
        const payload = token ? JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { user?: { role?: string } } : null;
        if (payload?.user?.role !== 'admin') return;
        setIsPlatformAdmin(true);
        const response = await apiFetch('/admin/organizations', { cache: 'no-store' });
        if (!response.ok) throw new Error(await getApiError(response, 'क्लाइंट सूची लोड नहीं हुई।'));
        setOrganizations(await response.json() as Organization[]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'क्लाइंट सूची लोड नहीं हुई।');
      }
    });
  }, []);

  const supportTotals = useMemo(() => {
    const totals = { core: 0, swing: 0, opposition: 0, unmarked: 0 };
    data?.support.forEach(({ status, count }) => {
      if (status in totals) totals[status] = count;
    });
    return totals;
  }, [data]);
  const total = Object.values(supportTotals).reduce((sum, value) => sum + value, 0);
  const voted = data?.booths.reduce((sum, booth) => sum + booth.voted, 0) ?? 0;
  const turnout = total ? Math.round((voted / total) * 100) : 0;
  const wardCount = new Set(data?.booths.map((booth) => booth.ward).filter(Boolean)).size;
  const forecast = Math.round(supportTotals.core + supportTotals.swing * 0.5 + supportTotals.unmarked * baseline / 100);
  const supportCards: SupportStatus[] = ['core', 'swing', 'opposition', 'unmarked'];

  return (
    <div className="work-page">
      <div className="page-intro">
        <div><div className="eyebrow-label"><span className="eyebrow-mark" /> FIELD OVERVIEW</div><h1>वॉर रूम</h1><p>समर्थन tags और बूथ-स्तर की स्थिति—सिर्फ़ डेटाबेस में दर्ज मतदाता रिकॉर्ड से।</p></div>
        <div className="feature-actions">
          {isPlatformAdmin && <label className="ward-select-label">क्लाइंट
            <select aria-label="वॉर रूम क्लाइंट" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
              <option value="">सभी क्लाइंट</option>{organizations.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>}
          <button className="button-secondary" type="button" onClick={() => void loadData()} disabled={loading}>{loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />} रिफ्रेश</button>
          <Link className="button-secondary" href="/workers"><UsersRound size={15} /> कार्यकर्ता देखें</Link>
        </div>
      </div>

      {error && <div className="inline-notice error-notice" role="alert">{error}</div>}
      <section className="feature-metrics">
        <article className="metric-card"><span>कुल मतदाता</span><strong>{loading ? '—' : total.toLocaleString('hi-IN')}</strong><small>चुने हुए दायरे में</small></article>
        <article className="metric-card metric-card-green"><span>मतदान दर्ज</span><strong>{loading ? '—' : voted.toLocaleString('hi-IN')}</strong><small>डेटाबेस स्थिति</small></article>
        <article className="metric-card"><span>टर्नआउट</span><strong>{loading ? '—' : `${turnout}%`}</strong><small>दर्ज मतदाता / कुल</small></article>
        <article className="metric-card"><span>बूथ / भाग</span><strong>{loading ? '—' : data?.booths.length ?? 0}</strong><small>डेटाबेस में उपलब्ध groups</small></article>
        <article className="metric-card"><span>अलग वार्ड</span><strong>{loading ? '—' : wardCount}</strong><small>चुने हुए दायरे में</small></article>
      </section>

      <div className="section-title-row"><div><h2>Support classification</h2><p>ये manual tags हैं—इनसे कोई वोट projection या जीत का अनुमान नहीं बनाया गया है।</p></div></div>
      <section className="feature-metrics support-metrics">
        {supportCards.map((status) => {
          const count = supportTotals[status];
          const percent = total ? Math.round((count / total) * 100) : 0;
          return <article className="metric-card" key={status}><span>{supportLabels[status]}</span><strong>{loading ? '—' : count.toLocaleString('hi-IN')}</strong><div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div><small>{loading ? '—' : `${percent}% of records`}</small></article>;
        })}
      </section>

      <section className="records-panel">
        <div className="records-toolbar"><div><h2>वोट अनुमान</h2><p>केवल परिदृश्य गणना—नतीजा, वास्तविक समर्थन या जीत की संभावना नहीं।</p></div><span className="panel-count">{forecast.toLocaleString('hi-IN')} अनुमानित</span></div>
        <div className="feature-form-grid">
          <label>अवर्गीकृत रिकॉर्ड का baseline: {baseline}%
            <input type="range" min="0" max="100" step="1" value={baseline} onChange={(event) => setBaseline(Number(event.target.value))} />
          </label>
          <div><strong>सूत्र</strong><p>समर्थन चिह्नित × 100% + अनिर्णीत चिह्नित × 50% + अवर्गीकृत × {baseline}%</p></div>
          <div><strong>इनपुट</strong><p>{supportTotals.core.toLocaleString('hi-IN')} समर्थन · {supportTotals.swing.toLocaleString('hi-IN')} अनिर्णीत · {supportTotals.unmarked.toLocaleString('hi-IN')} अवर्गीकृत</p></div>
        </div>
        <div className="records-footnote">Baseline बदलने से केवल अनुमान बदलता है। विरोध चिह्नित रिकॉर्ड गणना में शामिल नहीं हैं; यह मॉडल planning के लिए है, चुनावी परिणाम का दावा नहीं।</div>
      </section>

      <div className="section-title-row"><div><h2>बूथ क्षमता मैट्रिक्स</h2><p>प्रत्येक वार्ड/भाग में मौजूद records, मतदान और manual tags।</p></div><span className="panel-count">{data?.booths.length ?? 0} groups</span></div>
      <section className="records-panel">
        {loading && !data ? <div className="empty-state"><LoaderCircle size={20} className="spin" /><p>बूथ सारांश लोड हो रहा है…</p></div> : data?.booths.length ? (
          <div className="table-scroll"><table className="voter-table desk-table"><thead><tr><th>वार्ड / भाग</th><th>कुल</th><th>मतदान</th><th>समर्थन चिह्नित</th><th>अनिर्णीत</th><th>विरोध चिह्नित</th><th>अवर्गीकृत</th><th>क्षमता स्थिति</th></tr></thead><tbody>
            {data.booths.map((booth) => {
              const taggedSupport = booth.total ? Math.round(((booth.core + booth.swing * 0.5) / booth.total) * 100) : 0;
              const strength = taggedSupport >= 60 ? 'अधिक चिह्नित समर्थन' : taggedSupport >= 35 ? 'मध्यम चिह्नित समर्थन' : 'कम चिह्नित समर्थन';
              return <tr key={`${booth.ward}-${booth.part}`}><td><div className="voter-name">{booth.ward || '—'}</div><div className="voter-subline">{booth.part || 'भाग उपलब्ध नहीं'}</div></td><td>{booth.total}</td><td>{booth.voted} / {booth.total}</td><td>{booth.core}</td><td>{booth.swing}</td><td>{booth.opposition}</td><td>{booth.unmarked}</td><td><span className="record-status">{strength} · {taggedSupport}%</span></td></tr>;
            })}
          </tbody></table></div>
        ) : <div className="empty-state"><strong>{error ? 'वॉर रूम डेटा उपलब्ध नहीं' : 'अभी कोई बूथ डेटा नहीं'}</strong><p>{error || 'वोटर रिकॉर्ड आयात होने पर मैट्रिक्स यहाँ दिखेगा।'}</p></div>}
        <div className="records-footnote">चुनाव परिणाम projection के लिए कोई baseline या अपुष्ट धारणा नहीं जोड़ी गई है।</div>
      </section>
    </div>
  );
}
