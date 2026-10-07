'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, MapPin, Phone, RefreshCw, UsersRound } from 'lucide-react';
import { apiFetch, getApiError } from '@/lib/api';

interface Worker {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: string;
  scope: string;
  scopeValue: string;
  isActive: boolean;
  assignedVoters: number;
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
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch('/users/workers', { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'कार्यकर्ता सूची लोड नहीं हुई।'));
      setWorkers(await response.json() as Worker[]);
    } catch (loadError) {
      setWorkers([]);
      setError(loadError instanceof Error ? loadError.message : 'कार्यकर्ता सूची लोड नहीं हुई।');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(() => load()); }, [load]);

  const showAssigned = async (worker: Worker) => {
    setSelected(worker);
    setVoters([]);
    setError('');
    setDetailLoading(true);
    try {
      const name = worker.name || worker.email;
      const response = await apiFetch(`/voters?${new URLSearchParams({ assignedWorker: name, page: '1', pageSize: '250' })}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'कार्यकर्ता की मतदाता सूची लोड नहीं हुई।'));
      const result = await response.json() as { data: AssignedVoter[] };
      setVoters(result.data);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : 'कार्यकर्ता की मतदाता सूची लोड नहीं हुई।');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="work-page">
      <div className="page-intro">
        <div><div className="eyebrow-label"><span className="eyebrow-mark" /> FIELD TEAM</div><h1>कार्यकर्ता</h1><p>सक्रिय खातों, scope और मतदाता assignments को डेटाबेस से देखें।</p></div>
        <div className="feature-actions">
          <button className="button-secondary" type="button" onClick={() => void load()} disabled={loading}>{loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />} रिफ्रेश</button>
          <Link className="button-primary" href="/accounts">खाता प्रबंधित करें</Link>
        </div>
      </div>
      {error && <div className="inline-notice error-notice" role="alert">{error}</div>}
      <section className="feature-metrics">
        <article className="metric-card"><span>कुल कार्यकर्ता</span><strong>{loading ? '—' : workers.length}</strong><small>इस संगठन के खाते</small></article>
        <article className="metric-card metric-card-green"><span>सक्रिय</span><strong>{loading ? '—' : workers.filter((item) => item.isActive).length}</strong><small>लॉगिन सक्षम</small></article>
        <article className="metric-card"><span>आवंटित मतदाता</span><strong>{loading ? '—' : workers.reduce((sum, item) => sum + item.assignedVoters, 0)}</strong><small>नाम/email assignment match</small></article>
      </section>
      {loading && !workers.length ? <div className="records-panel empty-state"><LoaderCircle size={20} className="spin" /><p>कार्यकर्ता लोड हो रहे हैं…</p></div> : workers.length ? (
        <section className="worker-card-grid">
          {workers.map((worker) => <article className="worker-card" key={worker.id}>
            <div className="worker-card-top"><span className="worker-avatar">{(worker.name || worker.email).slice(0, 1).toLocaleUpperCase()}</span><span className={`record-status ${worker.isActive ? 'status-voted' : 'status-pending'}`}>{worker.isActive ? 'सक्रिय' : 'बंद'}</span></div>
            <h2>{worker.name || worker.email}</h2><p className="worker-email">{worker.email}</p>
            <div className="worker-meta"><span><MapPin size={14} /> {worker.scope}{worker.scopeValue ? ` · ${worker.scopeValue}` : ''}</span><span><UsersRound size={14} /> {worker.assignedVoters} मतदाता</span><span>भूमिका · {worker.role}</span></div>
            <div className="feature-actions">
              <button className="button-secondary" type="button" onClick={() => void showAssigned(worker)}>मतदाता सूची</button>
              {worker.phone && <a className="button-quiet" href={`tel:${worker.phone}`}><Phone size={14} /> कॉल</a>}
              {worker.phone && <a className="button-quiet" href={`https://wa.me/${worker.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>}
            </div>
          </article>)}
        </section>
      ) : <div className="records-panel empty-state"><strong>कार्यकर्ता खाते उपलब्ध नहीं</strong><p>नया उप-खाता बनाने के लिए खाता प्रबंधन खोलें।</p></div>}

      {selected && <section className="records-panel">
        <div className="records-toolbar"><div><h2>{selected.name || selected.email} · आवंटित मतदाता</h2><p>{voters.length} दिखाए गए रिकॉर्ड</p></div><button className="button-quiet" type="button" onClick={() => setSelected(null)}>बंद करें</button></div>
        {detailLoading ? <div className="empty-state"><LoaderCircle size={19} className="spin" /><p>सूची लोड हो रही है…</p></div> : voters.length ? <div className="table-scroll"><table className="voter-table desk-table"><thead><tr><th>मतदाता</th><th>EPIC</th><th>वार्ड / भाग</th><th>घर / क्रमांक</th><th>स्थिति</th></tr></thead><tbody>{voters.map((voter) => <tr key={voter._id}><td>{voter.nameHi || voter.nameEn}</td><td>{voter.epic}</td><td>{voter.wardNo} · {voter.partNo}</td><td>{voter.houseNo} · {voter.serialNo}</td><td><span className={`record-status ${voter.voted ? 'status-voted' : 'status-pending'}`}>{voter.voted ? 'मतदान दर्ज' : 'शेष'}</span></td></tr>)}</tbody></table></div> : <div className="empty-state"><p>इस कार्यकर्ता के नाम/email से जुड़े मतदाता रिकॉर्ड नहीं मिले।</p></div>}
      </section>}
    </div>
  );
}
