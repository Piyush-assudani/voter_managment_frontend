'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  CheckCircle2,
  CircleHelp,
  Layers,
  LoaderCircle,
  MapPin,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  UserCheck,
  UserMinus,
  UsersRound,
} from 'lucide-react';
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

const supportConfig: Record<
  SupportStatus,
  { label: string; subLabel: string; icon: typeof ThumbsUp; cardClass: string; badgeClass: string; barClass: string }
> = {
  core: {
    label: '100% पक्का समर्थक',
    subLabel: 'पक्का वोटर बेस',
    icon: ThumbsUp,
    cardClass: 'support-card-core',
    badgeClass: 'support-badge-core',
    barClass: 'support-bar-core',
  },
  swing: {
    label: '50/50 स्विंग वोटर',
    subLabel: 'प्रयास योग्य वोटर',
    icon: CircleHelp,
    cardClass: 'support-card-swing',
    badgeClass: 'support-badge-swing',
    barClass: 'support-bar-swing',
  },
  opposition: {
    label: 'एंटी वोटर',
    subLabel: 'विरोधी रुझान',
    icon: ThumbsDown,
    cardClass: 'support-card-opposition',
    badgeClass: 'support-badge-opposition',
    barClass: 'support-bar-opposition',
  },
  unmarked: {
    label: 'सामान्य',
    subLabel: 'संपर्क शेष',
    icon: UserMinus,
    cardClass: 'support-card-unmarked',
    badgeClass: 'support-badge-unmarked',
    barClass: 'support-bar-unmarked',
  },
};

export default function WarroomPage() {
  const [data, setData] = useState<WarRoomData | null>(null);
  const [baseline, setBaseline] = useState(78);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // The apiFetch automatically sends x-organization-id from localStorage (admin or client)
      const response = await apiFetch('/features/war-room', { cache: 'no-store' });
      if (!response.ok) throw new Error(await getApiError(response, 'वॉर रूम डेटा लोड नहीं हुआ।'));
      setData((await response.json()) as WarRoomData);
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof Error ? loadError.message : 'वॉर रूम डेटा लोड नहीं हुआ।');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadData());
  }, [loadData]);

  useEffect(() => {
    const handleClientChange = () => {
      void loadData();
    };
    window.addEventListener('client-changed', handleClientChange);
    return () => window.removeEventListener('client-changed', handleClientChange);
  }, [loadData]);

  const supportTotals = useMemo(() => {
    const totals = { core: 0, swing: 0, opposition: 0, unmarked: 0 };
    data?.support?.forEach(({ status, count }) => {
      if (status in totals) totals[status] = count;
    });
    return totals;
  }, [data]);

  const total = Object.values(supportTotals).reduce((sum, value) => sum + value, 0);
  const voted = data?.booths?.reduce((sum, booth) => sum + booth.voted, 0) ?? 0;
  const turnout = total ? Math.round((voted / total) * 100) : 0;
  const wardCount = new Set(data?.booths?.map((booth) => booth.ward).filter(Boolean)).size;
  const forecast = Math.round(
    supportTotals.core + supportTotals.swing * 0.5 + (supportTotals.unmarked * baseline) / 100
  );
  const supportCards: SupportStatus[] = ['core', 'swing', 'opposition', 'unmarked'];

  const baselinePresets = [50, 65, 75, 78, 85, 90];

  return (
    <div className="work-page warroom-page-wrap">
      {/* PAGE HEADER */}
      <div className="page-intro">
        <div>
          <div className="eyebrow-label">
            <span className="eyebrow-mark" /> FIELD OVERVIEW · WAR ROOM
          </div>
          <h1>वॉर रूम कमांड सेंटर</h1>
          <p>समर्थन वर्गीकरण, मतदान टर्नआउट और बूथ-स्तर क्षमता का रीयल-टाइम अवलोकन।</p>
        </div>
        <div className="feature-actions">
          <button
            className="button-secondary"
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
          >
            {loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}
            <span>रिफ्रेश</span>
          </button>
          <Link className="button-secondary" href="/workers">
            <UsersRound size={15} />
            <span>कार्यकर्ता देखें</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="inline-notice error-notice" role="alert">
          {error}
        </div>
      )}

      {/* TOP 5 KPIS */}
      <section className="warroom-kpi-grid">
        <article className="warroom-kpi-card">
          <div className="warroom-kpi-top">
            <span className="warroom-kpi-icon kpi-icon-blue">
              <UsersRound size={18} />
            </span>
            <span className="warroom-kpi-badge">कुल वोटर</span>
          </div>
          <strong className="warroom-kpi-val">
            {loading ? '—' : total.toLocaleString('hi-IN')}
          </strong>
          <small className="warroom-kpi-sub">चुने हुए दायरे में कुल रिकॉर्ड</small>
        </article>

        <article className="warroom-kpi-card">
          <div className="warroom-kpi-top">
            <span className="warroom-kpi-icon kpi-icon-green">
              <CheckCircle2 size={18} />
            </span>
            <span className="warroom-kpi-badge kpi-badge-green">मतदान दर्ज</span>
          </div>
          <strong className="warroom-kpi-val">
            {loading ? '—' : voted.toLocaleString('hi-IN')}
          </strong>
          <small className="warroom-kpi-sub">सत्यापित वोटिंग स्थिति</small>
        </article>

        <article className="warroom-kpi-card">
          <div className="warroom-kpi-top">
            <span className="warroom-kpi-icon kpi-icon-emerald">
              <TrendingUp size={18} />
            </span>
            <span className="warroom-kpi-badge">टर्नआउट</span>
          </div>
          <strong className="warroom-kpi-val">
            {loading ? '—' : `${turnout}%`}
          </strong>
          <small className="warroom-kpi-sub">{voted} / {total} मतदाता</small>
        </article>

        <article className="warroom-kpi-card">
          <div className="warroom-kpi-top">
            <span className="warroom-kpi-icon kpi-icon-purple">
              <Layers size={18} />
            </span>
            <span className="warroom-kpi-badge">बूथ / भाग</span>
          </div>
          <strong className="warroom-kpi-val">
            {loading ? '—' : data?.booths?.length ?? 0}
          </strong>
          <small className="warroom-kpi-sub">सक्रिय बूथ ग्रुप्स</small>
        </article>

        <article className="warroom-kpi-card warroom-kpi-span-mobile">
          <div className="warroom-kpi-top">
            <span className="warroom-kpi-icon kpi-icon-amber">
              <MapPin size={18} />
            </span>
            <span className="warroom-kpi-badge">वार्ड संख्या</span>
          </div>
          <strong className="warroom-kpi-val">
            {loading ? '—' : wardCount}
          </strong>
          <small className="warroom-kpi-sub">शामिल निर्वाचन क्षेत्र वार्ड</small>
        </article>
      </section>

      {/* SUPPORT CLASSIFICATION 4 CARDS */}
      <div className="warroom-section-header">
        <div>
          <h2>
            <UserCheck size={20} className="text-emerald-700" />
            <span>समर्थन वर्गीकरण (Support Classification)</span>
          </h2>
          <p>कार्यकर्ताओं द्वारा मार्क किए गए मैनुअल टैग्स—प्रत्येक वोटर की स्थिति।</p>
        </div>
      </div>

      <section className="warroom-support-grid">
        {supportCards.map((status) => {
          const cfg = supportConfig[status];
          const Icon = cfg.icon;
          const count = supportTotals[status];
          const percent = total ? Math.round((count / total) * 100) : 0;
          return (
            <article className={`warroom-support-card ${cfg.cardClass}`} key={status}>
              <div className="support-card-top">
                <div className="support-card-title-group">
                  <span className="support-icon-wrap">
                    <Icon size={16} />
                  </span>
                  <div>
                    <h3 className="support-card-title">{cfg.label}</h3>
                    <span className="support-card-sub">{cfg.subLabel}</span>
                  </div>
                </div>
                <span className={`support-percent-badge ${cfg.badgeClass}`}>
                  {loading ? '—' : `${percent}%`}
                </span>
              </div>

              <div className="support-counter-row">
                <strong className="support-count-num">
                  {loading ? '—' : count.toLocaleString('hi-IN')}
                </strong>
                <span className="support-counter-label">मतदाता</span>
              </div>

              <div className="warroom-progress-track">
                <div
                  className={`warroom-progress-fill ${cfg.barClass}`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className="support-card-footer">
                <span>{total ? `${percent}% of कुल रिकॉर्ड` : 'कोई रिकॉर्ड नहीं'}</span>
                <span>{loading ? '—' : `${count.toLocaleString('hi-IN')} दर्ज`}</span>
              </div>
            </article>
          );
        })}
      </section>

      {/* VOTE SIMULATION / FORECAST PANEL */}
      <section className="warroom-sim-panel">
        <div className="sim-panel-header">
          <div className="sim-header-info">
            <div className="sim-title-row">
              <span className="sim-header-icon">
                <Calculator size={19} />
              </span>
              <div>
                <h2>वोट अनुमान सिम्युलेटर (Scenario Model)</h2>
                <p>अवर्गीकृत (बाकी) वोटरों के विभिन्न रुझानों के आधार पर संभावित परिदृश्य गणना।</p>
              </div>
            </div>
          </div>
          <div className="sim-forecast-badge">
            <Sparkles size={16} className="text-emerald-300" />
            <div className="sim-forecast-text">
              <small>अनुमानित समर्थन</small>
              <strong>{forecast.toLocaleString('hi-IN')} वोट</strong>
            </div>
          </div>
        </div>

        <div className="sim-panel-body">
          {/* SLIDER CONTROL */}
          <div className="sim-slider-box">
            <div className="sim-slider-header">
              <label htmlFor="baseline-slider" className="sim-slider-label">
                <SlidersHorizontal size={16} />
                <span>सामान्य रिकॉर्ड का बेसलाइन शेयर:</span>
                <span className="sim-slider-val-badge">{baseline}%</span>
              </label>
              <div className="sim-presets">
                {baselinePresets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`sim-preset-btn ${baseline === p ? 'is-active' : ''}`}
                    onClick={() => setBaseline(p)}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            <input
              id="baseline-slider"
              type="range"
              min="0"
              max="100"
              step="1"
              value={baseline}
              onChange={(e) => setBaseline(Number(e.target.value))}
              className="warroom-range-slider"
            />
            <div className="sim-slider-ticks">
              <span>0% (रूढ़िवादी)</span>
              <span>50% (औसत)</span>
              <span>100% (अधिकतम)</span>
            </div>
          </div>

          {/* 3 LIVE COMPUTATION PILLS */}
          <div className="sim-pills-grid">
            <div className="sim-pill-card pill-core">
              <span className="sim-pill-title">
                <ThumbsUp size={14} /> 100% पक्का समर्थक
              </span>
              <strong className="sim-pill-calc">
                {supportTotals.core.toLocaleString('hi-IN')} × 1.0 = {supportTotals.core.toLocaleString('hi-IN')}
              </strong>
              <small>शत-प्रतिशत पक्के वोट</small>
            </div>

            <div className="sim-pill-card pill-swing">
              <span className="sim-pill-title">
                <CircleHelp size={14} /> 50/50 स्विंग वोटर
              </span>
              <strong className="sim-pill-calc">
                {supportTotals.swing.toLocaleString('hi-IN')} × 0.5 = {Math.round(supportTotals.swing * 0.5).toLocaleString('hi-IN')}
              </strong>
              <small>आधे संभावित स्विंग वोट</small>
            </div>

            <div className="sim-pill-card pill-unmarked">
              <span className="sim-pill-title">
                <UserMinus size={14} /> सामान्य ({baseline}%)
              </span>
              <strong className="sim-pill-calc">
                {supportTotals.unmarked.toLocaleString('hi-IN')} × {baseline}% = {Math.round((supportTotals.unmarked * baseline) / 100).toLocaleString('hi-IN')}
              </strong>
              <small>बेसलाइन अनुरूप रूपांतरण</small>
            </div>
          </div>

          <div className="sim-formula-banner">
            <span className="sim-formula-tag">सूत्र विधि</span>
            <code>
              कुल अनुमान = (पक्का समर्थक × 100%) + (50/50 स्विंग × 50%) + (सामान्य × {baseline}%)
            </code>
          </div>

          <div className="records-footnote">
            ℹ️ <strong>नोट:</strong> Baseline केवल आंतरिक विश्लेषण और बूथ प्लानिंग मॉडल है; यह चुनाव परिणाम का दावा नहीं करता। एंटी वोटर इसमें शामिल नहीं किए जाते।
          </div>
        </div>
      </section>

      {/* BOOTH MATRIX TABLE */}
      <div className="warroom-section-header">
        <div>
          <h2>
            <Layers size={20} className="text-emerald-700" />
            <span>बूथ क्षमता मैट्रिक्स (Booth Capacity Matrix)</span>
          </h2>
          <p>प्रत्येक वार्ड और भाग में मौजूद कुल रिकॉर्ड्स, मतदान और समर्थन स्थिति।</p>
        </div>
        <span className="panel-count">{data?.booths?.length ?? 0} बूथ ग्रुप्स</span>
      </div>

      <section className="records-panel warroom-table-card">
        {loading && !data ? (
          <div className="empty-state">
            <LoaderCircle size={22} className="spin text-emerald-700" />
            <p>बूथ सारांश लोड हो रहा है…</p>
          </div>
        ) : data?.booths?.length ? (
          <div className="table-scroll">
            <table className="voter-table desk-table warroom-table">
              <thead>
                <tr>
                  <th>वार्ड / भाग</th>
                  <th>कुल वोटर</th>
                  <th>मतदान प्रगति</th>
                  <th>100% पक्का समर्थक</th>
                  <th>50/50 स्विंग</th>
                  <th>एंटी वोटर</th>
                  <th>सामान्य</th>
                  <th>स्थिति व रुझान</th>
                </tr>
              </thead>
              <tbody>
                {data.booths.map((booth) => {
                  const taggedSupport = booth.total
                    ? Math.round(((booth.core + booth.swing * 0.5) / booth.total) * 100)
                    : 0;
                  const isHigh = taggedSupport >= 60;
                  const isMed = taggedSupport >= 35 && taggedSupport < 60;
                  const strengthBadge = isHigh
                    ? 'status-badge-high'
                    : isMed
                    ? 'status-badge-med'
                    : 'status-badge-low';
                  const strengthLabel = isHigh
                    ? 'मजबूत समर्थन'
                    : isMed
                    ? 'मध्यम समर्थन'
                    : 'प्रयास योग्य';

                  return (
                    <tr key={`${booth.ward}-${booth.part}`}>
                      <td>
                        <div className="voter-name">{booth.ward ? `वार्ड नं. ${booth.ward}` : '—'}</div>
                        <div className="voter-subline">
                          {booth.part ? `भाग क्र. ${booth.part}` : 'भाग उपलब्ध नहीं'}
                        </div>
                      </td>
                      <td>
                        <strong>{booth.total.toLocaleString('hi-IN')}</strong>
                      </td>
                      <td>
                        <div className="booth-turnout-cell">
                          <span>{booth.voted} / {booth.total}</span>
                          <span className="booth-turnout-pct">
                            {booth.total ? `${Math.round((booth.voted / booth.total) * 100)}%` : '0%'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="num-pill num-pill-green">{booth.core}</span>
                      </td>
                      <td>
                        <span className="num-pill num-pill-amber">{booth.swing}</span>
                      </td>
                      <td>
                        <span className="num-pill num-pill-rose">{booth.opposition}</span>
                      </td>
                      <td>
                        <span className="num-pill num-pill-slate">{booth.unmarked}</span>
                      </td>
                      <td>
                        <span className={`record-status-pill ${strengthBadge}`}>
                          {strengthLabel} · {taggedSupport}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <strong>{error ? 'वॉर रूम डेटा उपलब्ध नहीं' : 'अभी कोई बूथ डेटा नहीं'}</strong>
            <p>{error || 'वोटर रिकॉर्ड आयात होने पर मैट्रिक्स यहाँ दिखेगा।'}</p>
          </div>
        )}
      </section>
    </div>
  );
}
