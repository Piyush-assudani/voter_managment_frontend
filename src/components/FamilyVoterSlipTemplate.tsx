'use client';

import React from 'react';
import { SlipConfig, VoterSlipData, defaultSlipConfig } from './VoterSlipTemplate';

export interface FamilyVoterSlipProps {
  familyMembers: VoterSlipData[];
  houseNo?: string;
  wardNo?: string;
  partNo?: string;
  boothName?: string;
  metadata?: { houseNo?: string; wardNo?: string; partNo?: string; boothName?: string };
  config?: SlipConfig;
  forwardedRef?: React.Ref<HTMLDivElement>;
  isInline?: boolean;
}

export const FamilyVoterSlipTemplate: React.FC<FamilyVoterSlipProps> = ({
  familyMembers = [],
  houseNo,
  wardNo,
  partNo,
  boothName,
  metadata,
  config = defaultSlipConfig,
  forwardedRef,
  isInline = false,
}) => {
  const merged = { ...defaultSlipConfig, ...config };

  // Resolve metadata from props or first member
  const first = familyMembers[0] || {};
  const effectiveHouse = houseNo || metadata?.houseNo || first.houseNo || '—';
  const effectiveWard = (wardNo || metadata?.wardNo || first.wardNo || '').replace(/^(वार्ड|Ward)\s*/i, '') || '—';
  const effectivePart = partNo || metadata?.partNo || first.partNo || '—';

  // Ward-specific booth fallback logic
  const cleanWard = String(effectiveWard).trim();
  const wardStation = merged.wardPollingStations && typeof merged.wardPollingStations === 'object'
    ? (merged.wardPollingStations[cleanWard]
       || merged.wardPollingStations[`वार्ड ${cleanWard}`]
       || merged.wardPollingStations[`Ward ${cleanWard}`]
       || Object.entries(merged.wardPollingStations).find(([k, v]) => k.replace(/^(वार्ड|Ward)\s*/i, '').trim() === cleanWard && typeof v === 'string' && v.trim())?.[1])
    : null;

  const shouldShowWard = React.useMemo(() => {
    if (merged.metricType === 'ward') return true;
    if (merged.metricType === 'part') return false;
    if (merged.showWardInsteadOfPart !== undefined) return Boolean(merged.showWardInsteadOfPart);
    if (typeof window !== 'undefined') {
      const sysHide = localStorage.getItem('sys_hide_part_no');
      if (sysHide === 'true') return true;
    }
    return true;
  }, [merged.metricType, merged.showWardInsteadOfPart]);

  const effectiveBooth = boothName || wardStation || first.boothName || merged.pollingStationFallback || (shouldShowWard ? `वार्ड संख्या ${effectiveWard} का मतदान केंद्र` : `भाग संख्या ${effectivePart} का मतदान केंद्र`);

  const totalMembers = familyMembers.length;

  return (
    <div
      ref={forwardedRef}
      className="family-slip-printable-card"
      style={{
        width: '640px',
        maxWidth: '100%',
        margin: '0 auto',
        padding: '16px',
        background: '#ffffff',
        fontFamily: 'var(--font-noto-sans-devanagari), var(--font-anek-devanagari), "Noto Sans Devanagari", "Anek Devanagari", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0f172a',
        boxSizing: 'border-box',
        overflow: 'visible',
      }}
    >
      <div
        className="family-slip-inner-card"
        style={{
          border: '2.5px solid #1e3a8a',
          borderRadius: '14px',
          padding: '14px',
          background: '#ffffff',
          boxShadow: isInline ? '0 10px 25px -5px rgba(0, 0, 0, 0.1)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* ================= 1. CAMPAIGN HEADER RIBBON ================= */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
            color: '#ffffff',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Candidate Photo (Left) */}
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '2px solid rgba(255, 255, 255, 0.8)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {merged.candidateImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={merged.candidateImage}
                alt={merged.candidateName || 'प्रत्याशी'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '30px' }}>👤</span>
            )}
          </div>

          {/* Center: Candidate Name, Party & Appeal */}
          <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fde047', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              {merged.partyName || 'आधिकारिक प्रत्याशी'}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff', lineHeight: 1.25, marginTop: '2px' }}>
              {merged.candidateName || 'प्रत्याशी का नाम'}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#e0e7ff', marginTop: '2px' }}>
              {merged.appealHeadline || `(${merged.evmNumber || '1'} नंबर पर बटन दबाएं)`}
            </div>
          </div>

          {/* Party Symbol (Right) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '68px',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '10px',
                background: '#ffffff',
                border: '2px solid rgba(255, 255, 255, 0.8)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
              }}
            >
              {merged.partySymbolImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={merged.partySymbolImage}
                  alt={merged.partySymbolName || 'चुनाव चिन्ह'}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: '26px' }}>🗳️</span>
              )}
            </div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#ffffff',
                marginTop: '3px',
                textAlign: 'center',
                lineHeight: 1.1,
              }}
            >
              {merged.partySymbolName || 'चुनाव चिन्ह'}
            </span>
          </div>
        </div>

        {/* ================= 2. FAMILY BANNER BAR ================= */}
        <div
          style={{
            background: '#eff6ff',
            border: '1.5px solid #bfdbfe',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>👨‍👩‍👧‍👦</span>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#1e3a8a' }}>
                संयुक्त परिवार मतदाता सूचना पर्ची (Family Voter Slip)
              </div>
              <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600, marginTop: '1px' }}>
                मकान संख्या: <strong style={{ color: '#0f172a' }}>#{effectiveHouse}</strong> • वार्ड: <strong style={{ color: '#0f172a' }}>{effectiveWard}</strong>
                {!shouldShowWard && (
                  <> • भाग: <strong style={{ color: '#0f172a' }}>{effectivePart}</strong></>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              background: '#2563eb',
              color: '#ffffff',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>कुल मतदाता:</span>
            <span>{totalMembers}</span>
          </div>
        </div>

        {/* ================= 3. FAMILY MEMBERS TABLE ================= */}
        <div
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            maxWidth: '100%',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ background: '#1e3a8a', color: '#ffffff' }}>
                <th style={{ padding: '7px 8px', fontWeight: 700, width: '38px', textAlign: 'center' }}>क्र.</th>
                <th style={{ padding: '7px 8px', fontWeight: 700, width: '56px', textAlign: 'center' }}>सूची क्र.</th>
                <th style={{ padding: '7px 10px', fontWeight: 700 }}>मतदाता का नाम</th>
                <th style={{ padding: '7px 10px', fontWeight: 700 }}>संबंध व रिश्तेदार</th>
                <th style={{ padding: '7px 8px', fontWeight: 700, width: '70px', textAlign: 'center' }}>आयु/लिंग</th>
                <th style={{ padding: '7px 10px', fontWeight: 700, width: '130px' }}>पहचान पत्र (EPIC)</th>
              </tr>
            </thead>
            <tbody>
              {familyMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                    इस परिवार के कोई मतदाता रिकॉर्ड उपलब्ध नहीं हैं।
                  </td>
                </tr>
              ) : (
                familyMembers.map((member, idx) => {
                  const mName = member.nameHi || member.nameEn || '—';
                  const mRelName = member.relativeNameHi || member.relativeNameEn || '—';
                  const mRelType = member.relationType ? `${member.relationType}: ` : 'पिता/पति: ';
                  const mSerial = member.serialNo || '—';
                  const mAge = member.age ? `${member.age} वर्ष` : '—';
                  const mGender = member.gender === 'F' || member.gender === 'Female' || member.gender === 'महिला'
                    ? 'म'
                    : member.gender === 'M' || member.gender === 'Male' || member.gender === 'पुरुष'
                    ? 'पु'
                    : member.gender || '—';
                  const mEpic = member.epic || '—';

                  const isEven = idx % 2 === 1;

                  return (
                    <tr
                      key={member._id || `fam-idx-${idx}`}
                      style={{
                        background: isEven ? '#f8fafc' : '#ffffff',
                        borderBottom: idx < familyMembers.length - 1 ? '1px solid #e2e8f0' : 'none',
                      }}
                    >
                      <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 900, color: '#1e3a8a', fontSize: '13px' }}>
                        {mSerial}
                      </td>
                      <td style={{ padding: '7px 10px', fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>
                        {mName}
                      </td>
                      <td style={{ padding: '7px 10px', color: '#334155', fontWeight: 600 }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{mRelType}</span>
                        <span>{mRelName}</span>
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'center', color: '#334155', fontWeight: 600 }}>
                        {mAge} / {mGender}
                      </td>
                      <td style={{ padding: '7px 10px', fontWeight: 800, color: '#1d4ed8', fontFamily: 'monospace', fontSize: '12.5px' }}>
                        {mEpic}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ================= 4. POLLING STATION BOX ================= */}
        <div
          style={{
            background: '#ffffff',
            border: '1.5px solid #93c5fd',
            borderRadius: '10px',
            padding: '9px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '16px' }}>📍</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>
              मतदान केंद्र (Polling Station):
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '1px' }}>
              {effectiveBooth}
            </div>
          </div>
        </div>

        {/* ================= 5. CAMPAIGN APPEAL FOOTER ================= */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '6px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⭐</span>
            <span>{merged.footerAppeal || `${merged.partySymbolName || 'चुनाव चिन्ह'} का बटन दबाएं और भारी मतों से विजयी बनाएं!`}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
            🇮🇳 कृपया मतदान हेतु पहचान पत्र अवश्य साथ लाएं
          </div>
        </div>
      </div>
    </div>
  );
};
