import React from 'react';

export interface SlipConfig {
  candidateName?: string;
  candidateNameEn?: string;
  partyName?: string;
  partySymbolName?: string;
  partySymbolImage?: string;
  candidateImage?: string;
  evmNumber?: string;
  appealHeadline?: string;
  appealText?: string;
  subTitle?: string;
  footerAppeal?: string;
  pollingStationFallback?: string;
}

export const defaultSlipConfig: SlipConfig = {
  candidateName: 'प्रसन्न चंद मेहता',
  candidateNameEn: 'Prasann Chand Mehta',
  partyName: 'भारतीय जनता पार्टी (भाजपा) प्रत्याशी',
  partySymbolName: 'कमल का फूल',
  partySymbolImage: '',
  candidateImage: '',
  evmNumber: '1',
  appealHeadline: '(1 नंबर पर कमल का फूल का बटन दबाएं)',
  subTitle: 'मतदाता सूचना पर्ची (Voter Slip) · वार्ड नंबर 82 Jodhpur',
  appealText: 'वार्ड नंबर 82 से भाजपा प्रत्याशी प्रसन्न चंद मेहता को अपना अमूल्य वोट देकर भारी मतों से विजय बनाएं।',
  footerAppeal: 'कमल का बटन दबाएं और भारी मतों से विजयी बनाएं',
  pollingStationFallback: '569 - सामुदायिक भवन, जाटा बास, महामंदिर, जोधपुर',
};

export interface VoterSlipData {
  epic?: string;
  nameEn?: string;
  nameHi?: string;
  relativeNameEn?: string;
  relativeNameHi?: string;
  relationType?: string;
  age?: number | string;
  gender?: string;
  houseNo?: string;
  wardNo?: string;
  partNo?: string;
  serialNo?: number | string;
  boothName?: string;
}

interface VoterSlipTemplateProps {
  voter?: VoterSlipData;
  config?: SlipConfig;
  forwardedRef?: React.RefObject<HTMLDivElement | null>;
  isInline?: boolean;
}

export const VoterSlipTemplate: React.FC<VoterSlipTemplateProps> = ({
  voter = {},
  config = {},
  forwardedRef,
  isInline = false,
}) => {
  const merged: SlipConfig = { ...defaultSlipConfig, ...config };
  
  const voterName = (voter.nameEn || voter.nameHi) 
    ? `${voter.nameEn || ''}${voter.nameEn && voter.nameHi ? ' / ' : ''}${voter.nameHi || ''}`.trim()
    : 'Jabra Ram / जबरा राम';

  const relLabel = voter.relationType === 'husband' || voter.relationType === 'पति' 
    ? 'पति' 
    : voter.relationType === 'mother' || voter.relationType === 'माता'
    ? 'माता'
    : 'पिता';

  const relativeName = (voter.relativeNameEn || voter.relativeNameHi)
    ? `${voter.relativeNameEn || ''}${voter.relativeNameEn && voter.relativeNameHi ? ' / ' : ''}${voter.relativeNameHi || ''}`.trim()
    : 'Nariga Ram / नरिगा राम';

  const ward = (voter.wardNo || '82').replace(/^(वार्ड|Ward)\s*/i, '');
  const part = (voter.partNo || '1').replace(/^(भाग|Part)\s*/i, '');
  const serial = voter.serialNo ?? '1';
  const house = voter.houseNo || '279';
  const ageGender = `${voter.age || '28'} वर्ष | ${voter.gender || 'पुरुष'}`;
  const epic = voter.epic || 'RLJ1213180';
  const pollingStation = voter.boothName || merged.pollingStationFallback || `${part} - सामुदायिक भवन, जाटा बास, महामंदिर, जोधपुर`;

  const containerStyle: React.CSSProperties = isInline
    ? {
        width: '100%',
        maxWidth: '560px',
        margin: '0 auto',
        fontFamily: '"Inter", "Noto Sans Devanagari", sans-serif',
        color: '#0f172a',
        boxSizing: 'border-box',
      }
    : {
        width: '600px',
        padding: '16px',
        background: '#ffffff',
        fontFamily: '"Inter", "Noto Sans Devanagari", sans-serif',
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
        color: '#0f172a',
        boxSizing: 'border-box',
      };

  return (
    <div ref={forwardedRef as any} style={containerStyle} className="voter-slip-printable-card">
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '3px solid #16a34a',
          padding: '18px 20px',
          boxShadow: '0 4px 20px -2px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxSizing: 'border-box',
        }}
      >
        {/* ================= 1. TOP HEADER SECTION ================= */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: '14px', justifyContent: 'space-between' }}>
          
          {/* Left: Party Symbol & Candidate Serial Box */}
          <div
            style={{
              width: '110px',
              minWidth: '110px',
              border: '2px solid #fb923c',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            {/* Top Serial Badge */}
            <div
              style={{
                width: '100%',
                background: '#ea580c',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 800,
                textAlign: 'center',
                padding: '4px 0',
                letterSpacing: '0.5px',
              }}
            >
              क्र. सं. {merged.evmNumber || '1'}
            </div>

            {/* Symbol Image */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
              {merged.partySymbolImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={merged.partySymbolImage}
                  alt={merged.partySymbolName || 'Party Symbol'}
                  style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                />
              ) : (
                /* Default Lotus / Symbol Vector */
                <svg width="60" height="52" viewBox="0 0 100 85" fill="none" stroke="#ea580c" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M50 10 C50 35 35 55 50 75 C65 55 50 35 50 10 Z" fill="#fff7ed" />
                  <path d="M50 30 C32 40 20 60 40 75 C30 65 35 45 50 30 Z" fill="#fff7ed" />
                  <path d="M50 30 C68 40 80 60 60 75 C70 65 65 45 50 30 Z" fill="#fff7ed" />
                  <path d="M50 48 C22 55 10 70 32 78 C20 72 25 58 50 48 Z" fill="#fff7ed" />
                  <path d="M50 48 C78 55 90 70 68 78 C80 72 75 58 50 48 Z" fill="#fff7ed" />
                  <path d="M22 78 Q50 85 78 78" stroke="#16a34a" strokeWidth="4" />
                </svg>
              )}
            </div>

            {/* Bottom Symbol Caption */}
            <div
              style={{
                width: '88%',
                marginBottom: '6px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '5px',
                color: '#ea580c',
                fontSize: '11px',
                fontWeight: 700,
                textAlign: 'center',
                padding: '2px 0',
              }}
            >
              {merged.partySymbolName || 'कमल का फूल'}
            </div>
          </div>

          {/* Center: Party Headline & Candidate Name */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: '0 4px' }}>
            <div
              style={{
                color: '#ea580c',
                fontSize: '13px',
                fontWeight: 700,
                lineHeight: 1.35,
                marginBottom: '4px',
              }}
            >
              {merged.partyName || 'भारतीय जनता पार्टी (भाजपा) प्रत्याशी'}
              {merged.appealHeadline ? ` ${merged.appealHeadline}` : ''}
            </div>

            <div
              style={{
                color: '#1e3a8a',
                fontSize: '22px',
                fontWeight: 900,
                letterSpacing: '-0.3px',
                lineHeight: 1.25,
                margin: '2px 0 6px',
              }}
            >
              {merged.candidateName || 'प्रसन्न चंद मेहता'}
              {merged.candidateNameEn ? ` (${merged.candidateNameEn})` : ''}
            </div>

            <div
              style={{
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: 600,
              }}
            >
              {merged.subTitle || `मतदाता सूचना पर्ची (Voter Slip) · वार्ड नंबर ${ward} Jodhpur`}
            </div>
          </div>

          {/* Right: Candidate Photo Box */}
          <div
            style={{
              width: '105px',
              minWidth: '105px',
              height: '125px',
              border: '2px solid #fb923c',
              borderRadius: '10px',
              overflow: 'hidden',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {merged.candidateImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={merged.candidateImage}
                alt={merged.candidateName || 'Candidate'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              /* Candidate Portrait Placeholder */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                <svg width="54" height="54" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#ea580c', marginTop: '2px' }}>प्रत्याशी फोटो</span>
              </div>
            )}
          </div>
        </div>

        {/* ================= 2. MIDDLE EVM / RIBBON STRIPE ================= */}
        <div
          style={{
            background: 'linear-gradient(90deg, #ea580c 0%, #c2410c 14%, #1d4ed8 40%, #1e3a8a 100%)',
            borderRadius: '10px',
            padding: '7px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#ffffff',
          }}
        >
          {/* Big EVM Number Badge */}
          <div
            style={{
              background: '#ffffff',
              color: '#ea580c',
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              fontWeight: 900,
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              flexShrink: 0,
            }}
          >
            {merged.evmNumber || '1'}
          </div>

          {/* EVM Message */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.2px' }}>
              ईवीएम / मतपत्र क्रम संख्या: {merged.evmNumber || '1'}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 500, opacity: 0.95, lineHeight: 1.3, marginTop: '2px' }}>
              {merged.appealText || `वार्ड नंबर ${ward} से प्रत्याशी ${merged.candidateName || ''} को अपना अमूल्य वोट देकर भारी मतों से विजय बनाएं।`}
            </div>
          </div>

          {/* Right Symbol Mini Pill */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '7px',
              padding: '3px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#ea580c',
              fontSize: '11px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {merged.partySymbolImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={merged.partySymbolImage} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
            ) : (
              <span>🌸</span>
            )}
            <span>{merged.partySymbolName || 'कमल का फूल'}</span>
          </div>
        </div>

        {/* ================= 3. TWO BIG HIGHLIGHT METRIC CARDS ================= */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {/* Part Card */}
          <div
            style={{
              background: '#f0f7ff',
              border: '2px solid #60a5fa',
              borderRadius: '10px',
              padding: '10px 14px',
              textAlign: 'center',
            }}
          >
            <div style={{ color: '#1e3a8a', fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.3px' }}>
              भाग संख्या (PART)
            </div>
            <div style={{ color: '#1e3a8a', fontSize: '36px', fontWeight: 900, lineHeight: 1.1, marginTop: '4px' }}>
              {part}
            </div>
          </div>

          {/* Serial Card */}
          <div
            style={{
              background: '#f0f7ff',
              border: '2px solid #60a5fa',
              borderRadius: '10px',
              padding: '10px 14px',
              textAlign: 'center',
            }}
          >
            <div style={{ color: '#ea580c', fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.3px' }}>
              क्रम संख्या (SL. NO.)
            </div>
            <div style={{ color: '#ea580c', fontSize: '36px', fontWeight: 900, lineHeight: 1.1, marginTop: '4px' }}>
              {serial}
            </div>
          </div>
        </div>

        {/* ================= 4. VOTER DETAILS TABLE ================= */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Row 1: Voter Name */}
          <div
            style={{
              display: 'flex',
              padding: '7px 4px',
              borderBottom: '1px dotted #cbd5e1',
              fontSize: '14px',
            }}
          >
            <span style={{ width: '130px', color: '#334155', fontWeight: 600 }}>मतदाता का नाम:</span>
            <strong style={{ flex: 1, color: '#0f172a', fontWeight: 800 }}>{voterName}</strong>
          </div>

          {/* Row 2: Relative Name */}
          <div
            style={{
              display: 'flex',
              padding: '7px 4px',
              borderBottom: '1px dotted #cbd5e1',
              fontSize: '14px',
            }}
          >
            <span style={{ width: '130px', color: '#334155', fontWeight: 600 }}>{relLabel}:</span>
            <strong style={{ flex: 1, color: '#0f172a', fontWeight: 700 }}>{relativeName}</strong>
          </div>

          {/* Row 3: House No */}
          <div
            style={{
              display: 'flex',
              padding: '7px 4px',
              borderBottom: '1px dotted #cbd5e1',
              fontSize: '14px',
            }}
          >
            <span style={{ width: '130px', color: '#334155', fontWeight: 600 }}>मकान संख्या:</span>
            <strong style={{ flex: 1, color: '#0f172a', fontWeight: 800 }}>{house}</strong>
          </div>

          {/* Row 4: Age & Gender */}
          <div
            style={{
              display: 'flex',
              padding: '7px 4px',
              borderBottom: '1px dotted #cbd5e1',
              fontSize: '14px',
            }}
          >
            <span style={{ width: '130px', color: '#334155', fontWeight: 600 }}>आयु / लिंग:</span>
            <strong style={{ flex: 1, color: '#0f172a', fontWeight: 700 }}>{ageGender}</strong>
          </div>

          {/* Row 5: EPIC ID */}
          <div
            style={{
              display: 'flex',
              padding: '7px 4px',
              fontSize: '14px',
              alignItems: 'center',
            }}
          >
            <span style={{ width: '130px', color: '#334155', fontWeight: 600 }}>पहचान पत्र (EPIC):</span>
            <strong style={{ flex: 1, color: '#1d4ed8', fontWeight: 900, fontSize: '15px', letterSpacing: '0.6px' }}>{epic}</strong>
          </div>
        </div>

        {/* ================= 5. POLLING STATION CARD ================= */}
        <div
          style={{
            background: '#ffffff',
            border: '1.5px solid #93c5fd',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ea580c', fontSize: '12.5px', fontWeight: 700 }}>
            <span>📍</span>
            <span>मतदान केंद्र (Polling Station):</span>
          </div>
          <div style={{ color: '#0f172a', fontSize: '14px', fontWeight: 800, paddingLeft: '22px' }}>
            {pollingStation}
          </div>
        </div>

        {/* ================= 6. BOTTOM APPEAL FOOTER ================= */}
        <div style={{ textAlign: 'center', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ color: '#ea580c', fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span>🗳️</span>
            <span>{merged.footerAppeal || `${merged.partySymbolName || 'कमल'} का बटन दबाएं और भारी मतों से विजयी बनाएं`}</span>
            <span>🗳️</span>
          </div>
          <div style={{ color: '#475569', fontSize: '11px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span>🙏</span>
            <span>कृपया मतदान के दिन अपना पहचान पत्र (Voter ID / आधार कार्ड) साथ लाएं।</span>
          </div>
        </div>

      </div>
    </div>
  );
};
