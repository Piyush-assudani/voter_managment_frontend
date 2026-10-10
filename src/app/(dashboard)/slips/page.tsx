'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  LoaderCircle,
  Printer,
  RefreshCw,
  Search,
  Send,
  Ticket,
  UserCheck,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { apiFetch, getApiError } from '@/lib/api';
import { VoterSlipTemplate, SlipConfig, defaultSlipConfig } from '@/components/VoterSlipTemplate';
import { downloadSlip } from '@/lib/downloadSlip';

interface Voter {
  _id: string;
  epic: string;
  nameEn: string;
  nameHi: string;
  relativeNameEn: string;
  relativeNameHi: string;
  relationType: string;
  age: number;
  gender: string;
  houseNo: string;
  wardNo: string;
  partNo: string;
  serialNo: number;
  phone?: string;
  caste?: string;
  voted?: boolean;
  boothName?: string;
}

export default function SlipsPage() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [partFilter, setPartFilter] = useState('');
  const [availableWards, setAvailableWards] = useState<string[]>([]);
  const [availableParts, setAvailableParts] = useState<string[]>([]);
  const [slipConfig, setSlipConfig] = useState<SlipConfig>(defaultSlipConfig);
  const [orgName, setOrgName] = useState('विजयसेतु चुनाव वॉर रूम');

  // WhatsApp Quota state
  const [whatsappQuota, setWhatsappQuota] = useState<{
    whatsappEnabled: boolean;
    whatsappCredits: number;
    whatsappUsed: number;
    canSend: boolean;
    metaConfigured: boolean;
  } | null>(null);

  // WhatsApp Modal
  const [isWpModalOpen, setIsWpModalOpen] = useState(false);
  const [wpPhone, setWpPhone] = useState('');
  const [wpSending, setWpSending] = useState(false);
  const [wpMessage, setWpMessage] = useState('');

  // Bulk Print Mode
  const [bulkMode, setBulkMode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const printContainerRef = useRef<HTMLDivElement>(null);

  // 1. Load Slip Configuration
  const loadSlipConfig = useCallback(async () => {
    try {
      const res = await apiFetch('/features/slip-config', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.slipConfig) {
          setSlipConfig({ ...defaultSlipConfig, ...data.slipConfig });
        }
        if (data.organizationName) {
          setOrgName(data.organizationName);
        }
      }
    } catch (e) {
      console.warn('Slip config load warning:', e);
    }
  }, []);

  // 2. Load WhatsApp Quota
  const loadWhatsappQuota = useCallback(async () => {
    try {
      const res = await apiFetch('/whatsapp/quota', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setWhatsappQuota(data);
      }
    } catch {}
  }, []);

  // 3. Load Voters
  const loadVoters = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: '1',
        pageSize: '100',
      });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (wardFilter) params.set('ward', wardFilter);
      if (partFilter) params.set('part', partFilter);

      const res = await apiFetch(`/voters?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(await getApiError(res, 'मतदाता लोड नहीं हो सके'));
      const data = await res.json();
      const list: Voter[] = data.voters || [];
      setVoters(list);

      // Extract unique wards & parts
      const wards = Array.from(new Set(list.map((v) => v.wardNo).filter(Boolean))) as string[];
      const parts = Array.from(new Set(list.map((v) => v.partNo).filter(Boolean))) as string[];
      if (wards.length) setAvailableWards((prev) => Array.from(new Set([...prev, ...wards])).sort());
      if (parts.length) setAvailableParts((prev) => Array.from(new Set([...prev, ...parts])).sort());

      // Select first voter by default if not set
      if (list.length > 0) {
        setSelectedVoter((prev) => {
          if (!prev) return list[0];
          const exists = list.find((v) => v._id === prev._id);
          return exists || list[0];
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'डेटा लोड करने में त्रुटि हुई');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, wardFilter, partFilter]);

  useEffect(() => {
    void loadSlipConfig();
    void loadWhatsappQuota();
    void loadVoters();
  }, [loadSlipConfig, loadWhatsappQuota, loadVoters]);

  // Quick WhatsApp Send (Manual wa.me)
  const handleManualWhatsApp = async () => {
    if (!selectedVoter) return;
    setWpSending(true);
    setWpMessage('');
    try {
      const response = await apiFetch('/whatsapp/send-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterId: selectedVoter._id,
          phoneNumber: wpPhone || selectedVoter.phone || '',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'WhatsApp पर्ची नहीं भेजी जा सकी');
      }
      if (typeof data.remainingCredits === 'number') {
        setWhatsappQuota((prev) =>
          prev ? { ...prev, whatsappCredits: data.remainingCredits, whatsappUsed: (prev.whatsappUsed || 0) + 1 } : prev
        );
      }
      setWpMessage('1 क्रेडिट काटा गया। WhatsApp चैट खोली जा रही है...');
      if (data.waLink) {
        window.open(data.waLink, '_blank');
      }
      setTimeout(() => {
        setIsWpModalOpen(false);
      }, 1200);
    } catch (err) {
      setWpMessage(err instanceof Error ? err.message : 'संदेश भेजने में त्रुटि हुई');
    } finally {
      setWpSending(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    if (!selectedVoter) return;
    setIsDownloading(true);
    try {
      await downloadSlip(selectedVoter, slipConfig);
    } catch {
      alert('पर्ची इमेज डाउनलोड नहीं हो सकी');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="work-page slips-studio-page">
      {/* Print-only CSS styling */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .voter-slip-printable-card,
          .voter-slip-printable-card * {
            visibility: visible;
          }
          .voter-slip-printable-card {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 580px !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .slips-bulk-print-grid,
          .slips-bulk-print-grid * {
            visibility: visible;
          }
          .slips-bulk-print-grid {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 15px !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="page-intro" style={{ marginBottom: '16px' }}>
        <div>
          <div className="eyebrow-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="eyebrow-mark" />
            <Ticket size={14} /> VOTER SLIP STUDIO
          </div>
          <h1 style={{ margin: '4px 0' }}>डिजिटल मतदाता पर्ची</h1>
          <p style={{ margin: 0 }}>
            आधिकारिक चुनाव आयोग प्रारूप व प्रत्याशी ब्रांडिंग के साथ व्यक्तिगत और थोक पर्ची जेनरेटर।
          </p>
        </div>

        <div className="feature-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="button-secondary"
            type="button"
            onClick={() => {
              void loadSlipConfig();
              void loadWhatsappQuota();
              void loadVoters();
            }}
            disabled={loading}
          >
            {loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}
            रिफ्रेश
          </button>

          <button
            className={`button-secondary ${bulkMode ? 'button-active' : ''}`}
            type="button"
            onClick={() => setBulkMode(!bulkMode)}
            style={{ borderColor: bulkMode ? '#16a34a' : undefined, color: bulkMode ? '#16a34a' : undefined }}
          >
            <Layers size={15} />
            {bulkMode ? 'एकल पर्ची देखें' : 'बल्क पर्ची शीट'}
          </button>
        </div>
      </div>

      {error && <div className="inline-notice error-notice" role="alert">{error}</div>}

      {/* Slip Branding Info Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#1e3a8a', fontSize: '14px' }}>
            <Sparkles size={16} color="#ea580c" />
            <span>संगठन: {orgName}</span>
          </div>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <div style={{ fontSize: '13px', color: '#475569' }}>
            प्रत्याशी: <strong style={{ color: '#0f172a' }}>{slipConfig.candidateName || 'प्रसन्न चंद मेहता'}</strong>
          </div>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <div style={{ fontSize: '13px', color: '#475569' }}>
            चुनाव चिन्ह: <strong style={{ color: '#ea580c' }}>{slipConfig.partySymbolName || 'कमल का फूल'}</strong>
          </div>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <div style={{ fontSize: '13px', color: '#475569' }}>
            EVM क्रम: <strong style={{ color: '#16a34a' }}>#{slipConfig.evmNumber || '1'}</strong>
          </div>
        </div>

        {/* WhatsApp Quota Pill */}
        {whatsappQuota && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: !whatsappQuota.whatsappEnabled ? '#fee2e2' : whatsappQuota.whatsappCredits <= 0 ? '#fef3c7' : '#f0fdf4',
              border: !whatsappQuota.whatsappEnabled ? '1px solid #fecaca' : whatsappQuota.whatsappCredits <= 0 ? '1px solid #fde68a' : '1px solid #bbf7d0',
              fontSize: '12px',
              fontWeight: 600,
              color: !whatsappQuota.whatsappEnabled ? '#991b1b' : whatsappQuota.whatsappCredits <= 0 ? '#92400e' : '#166534',
            }}
          >
            <span>💬 कोटा: {whatsappQuota.whatsappCredits} क्रेडिट</span>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div
        className="records-toolbar"
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
          <div className="search-field" style={{ flex: '1 1 200px' }}>
            <Search size={15} />
            <input
              placeholder="मतदाता खोजें (नाम, EPIC, क्रमांक, मकान)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          >
            <option value="">सभी वार्ड</option>
            {availableWards.map((w) => (
              <option key={w} value={w}>
                वार्ड {w}
              </option>
            ))}
          </select>

          <select
            value={partFilter}
            onChange={(e) => setPartFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          >
            <option value="">सभी भाग (Part)</option>
            {availableParts.map((p) => (
              <option key={p} value={p}>
                भाग {p}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '13px', color: '#64748b' }}>
          कुल <strong>{voters.length}</strong> मतदाता उपलब्ध
        </div>
      </div>

      {/* ================= BULK PRINT VIEW ================= */}
      {bulkMode ? (
        <section className="bulk-slips-section">
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px', margin: 0 }}>
              बल्क पर्ची प्रिंट शीट ({voters.length} पर्चियां)
            </h2>
            <button className="button-primary" type="button" onClick={handlePrint}>
              <Printer size={15} /> पूरी शीट प्रिंट करें
            </button>
          </div>

          <div
            className="slips-bulk-print-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))',
              gap: '24px',
            }}
          >
            {voters.map((voter) => (
              <div key={voter._id} style={{ background: '#fff', borderRadius: '16px' }}>
                <VoterSlipTemplate voter={voter} config={slipConfig} isInline={true} />
              </div>
            ))}
          </div>
        </section>
      ) : (
        /* ================= SINGLE VOTER SLIP STUDIO VIEW ================= */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(300px, 380px) 1fr',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* LEFT: Voter List */}
          <section
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 280px)',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f1f5f9',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.05em' }}>
                मतदाता चयन ({voters.length})
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>क्लिक करके पर्ची देखें</span>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
              {loading && voters.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  <LoaderCircle size={20} className="spin" style={{ margin: '0 auto 8px' }} />
                  मतदाता लोड हो रहे हैं...
                </div>
              ) : voters.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  कोई मतदाता नहीं मिला
                </div>
              ) : (
                voters.map((voter) => {
                  const isSelected = selectedVoter?._id === voter._id;
                  return (
                    <div
                      key={voter._id}
                      onClick={() => setSelectedVoter(voter)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        marginBottom: '6px',
                        cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                        border: isSelected ? '1.5px solid #3b82f6' : '1px solid #f1f5f9',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong style={{ color: isSelected ? '#1e40af' : '#0f172a', fontSize: '14px' }}>
                          {voter.nameHi || voter.nameEn || 'मतदाता'}
                        </strong>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#ea580c',
                            background: '#fff7ed',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid #fed7aa',
                          }}
                        >
                          #{voter.serialNo || '—'}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', gap: '8px' }}>
                        <span>EPIC: <strong>{voter.epic}</strong></span>
                        <span>•</span>
                        <span>भाग: {voter.partNo || '1'}</span>
                        <span>•</span>
                        <span>मकान: {voter.houseNo || '—'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* RIGHT: Live Slip Preview & Action Controls */}
          <section
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 4px 20px -4px rgba(0,0,0,0.05)',
            }}
          >
            {/* Top Slip Action Bar */}
            <div
              style={{
                width: '100%',
                maxWidth: '560px',
                marginBottom: '18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                प्रारूप पूर्वावलोकन (Live Slip Preview)
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="button-secondary"
                  type="button"
                  onClick={handlePrint}
                  disabled={!selectedVoter}
                  title="सीधे प्रिंटर पर भेजें या PDF सेव करें"
                >
                  <Printer size={15} /> प्रिंट
                </button>

                <button
                  className="button-secondary"
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={!selectedVoter || isDownloading}
                  title="हाई-डेफिनिशन JPG इमेज डाउनलोड करें"
                >
                  {isDownloading ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />}
                  JPG डाउनलोड
                </button>

                <button
                  type="button"
                  className="button-primary"
                  style={{ background: '#25D366', borderColor: '#22c55e', color: '#fff' }}
                  onClick={() => {
                    setWpPhone(selectedVoter?.phone || '');
                    setWpMessage('');
                    setIsWpModalOpen(true);
                  }}
                  disabled={!selectedVoter || whatsappQuota?.whatsappEnabled === false || (whatsappQuota ? whatsappQuota.whatsappCredits <= 0 : false)}
                  title="WhatsApp Web या App पर सीधे संदेश खोलें (1 क्रेडिट कटेगा)"
                >
                  <Send size={15} /> WhatsApp
                </button>
              </div>
            </div>

            {/* The Actual Voter Slip Card */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <VoterSlipTemplate
                voter={selectedVoter || undefined}
                config={slipConfig}
                isInline={true}
                forwardedRef={printContainerRef}
              />
            </div>
          </section>
        </div>
      )}

      {/* WhatsApp Modal */}
      {isWpModalOpen && selectedVoter && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsWpModalOpen(false);
          }}
        >
          <section className="form-modal" role="dialog" style={{ maxWidth: '440px', width: '95%' }}>
            <div className="modal-heading">
              <div>
                <span className="eyebrow-label">WHATSAPP DISPATCH</span>
                <h2 style={{ fontSize: '18px', margin: '4px 0' }}>WhatsApp पर्ची भेजें</h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  {selectedVoter.nameHi || selectedVoter.nameEn} ({selectedVoter.epic})
                </p>
              </div>
              <button className="icon-button" type="button" onClick={() => setIsWpModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {whatsappQuota && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    fontSize: '12px',
                    color: '#166534',
                    fontWeight: 600,
                  }}
                >
                  उपलब्ध कोटा: {whatsappQuota.whatsappCredits} क्रेडिट शेष (1 क्रेडिट कटेगा)
                </div>
              )}

              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                WhatsApp मोबाइल नंबर:
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={wpPhone}
                  onChange={(e) => setWpPhone(e.target.value)}
                  style={{ marginTop: '6px', height: '38px' }}
                />
              </label>

              {wpMessage && (
                <p className="form-error" style={{ fontSize: '12px', color: wpMessage.includes('कटा') ? '#166534' : '#dc2626' }}>
                  {wpMessage}
                </p>
              )}

              <div className="modal-actions" style={{ marginTop: '10px' }}>
                <button className="button-secondary" type="button" onClick={() => setIsWpModalOpen(false)}>
                  रद्द करें
                </button>
                <button
                  type="button"
                  className="button-primary"
                  style={{ background: '#25D366', borderColor: '#22c55e', color: '#fff' }}
                  onClick={handleManualWhatsApp}
                  disabled={wpSending || !wpPhone.trim()}
                >
                  {wpSending ? <LoaderCircle size={15} className="spin" /> : <Send size={15} />}
                  WhatsApp चैट खोलें
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
