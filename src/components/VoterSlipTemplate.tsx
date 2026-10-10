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

// Render vector symbol when no custom photo is uploaded
function renderSymbolVector(symbolName?: string) {
  const norm = (symbolName || '').toLowerCase();
  if (norm.includes('हाथ') || norm.includes('पंजा') || norm.includes('hand') || norm.includes('palm')) {
    // Congress Hand SVG
    return (
      <svg width="56" height="56" viewBox="0 0 100 100" fill="none" stroke="#1d4ed8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M42 22 V50 M52 14 V50 M62 20 V50 M72 32 V52 M34 40 C34 58 36 68 45 78 C54 88 68 88 74 78 C80 68 80 56 80 44" fill="#eff6ff" />
        <path d="M34 44 C26 48 24 56 30 64 C35 70 42 74 42 74" />
      </svg>
    );
  }
  if (norm.includes('पतंग') || norm.includes('kite')) {
    // Independent Kite SVG
    return (
      <svg width="56" height="56" viewBox="0 0 100 100" fill="none" stroke="#ea580c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="50,10 88,48 50,86 12,48" fill="#fff7ed" />
        <line x1="50" y1="10" x2="50" y2="86" stroke="#ea580c" strokeWidth="3" />
        <line x1="12" y1="48" x2="88" y2="48" stroke="#ea580c" strokeWidth="3" />
        <polygon points="50,86 42,96 58,96" fill="#ea580c" />
      </svg>
    );
  }
  if (norm.includes('बल्ला') || norm.includes('bat') || norm.includes('cricket')) {
    // Independent Cricket Bat SVG
    return (
      <svg width="56" height="56" viewBox="0 0 100 100" fill="none" stroke="#15803d" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="36" y="26" width="22" height="56" rx="4" fill="#f0fdf4" transform="rotate(-25 47 54)" />
        <line x1="56" y1="28" x2="68" y2="12" stroke="#ea580c" strokeWidth="5" />
        <circle cx="72" cy="72" r="8" fill="#dc2626" stroke="#dc2626" />
      </svg>
    );
  }
  if (norm.includes('चाबी') || norm.includes('key')) {
    // Independent Key SVG
    return (
      <svg width="56" height="56" viewBox="0 0 100 100" fill="none" stroke="#d97706" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="36" cy="40" r="18" fill="#fef3c7" />
        <circle cx="36" cy="40" r="8" fill="#ffffff" />
        <line x1="54" y1="40" x2="84" y2="40" strokeWidth="6" />
        <line x1="74" y1="40" x2="74" y2="54" strokeWidth="5" />
        <line x1="84" y1="40" x2="84" y2="52" strokeWidth="5" />
      </svg>
    );
  }
  if (norm.includes('झाड़ू') || norm.includes('broom')) {
    // AAP Broom SVG
    return (
      <svg width="56" height="56" viewBox="0 0 100 100" fill="none" stroke="#0284c7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="80" y1="18" x2="52" y2="50" stroke="#78350f" strokeWidth="6" />
        <polygon points="52,50 20,82 32,88 60,56" fill="#fef9c3" stroke="#eab308" strokeWidth="3" />
        <line x1="28" y1="84" x2="54" y2="54" stroke="#ca8a04" strokeWidth="2" />
      </svg>
    );
  }
  if (norm.includes('कमल') || norm.includes('lotus') || !norm) {
    // BJP Lotus SVG
    return (
      <svg width="60" height="52" viewBox="0 0 100 85" fill="none" stroke="#ea580c" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 10 C50 35 35 55 50 75 C65 55 50 35 50 10 Z" fill="#fff7ed" />
        <path d="M50 30 C32 40 20 60 40 75 C30 65 35 45 50 30 Z" fill="#fff7ed" />
        <path d="M50 30 C68 40 80 60 60 75 C70 65 65 45 50 30 Z" fill="#fff7ed" />
        <path d="M50 48 C22 55 10 70 32 78 C20 72 25 58 50 48 Z" fill="#fff7ed" />
        <path d="M50 48 C78 55 90 70 68 78 C80 72 75 58 50 48 Z" fill="#fff7ed" />
        <path d="M22 78 Q50 85 78 78" stroke="#16a34a" strokeWidth="4" />
      </svg>
    );
  }
  // Generic Election Symbol Stamp
  return (
    <svg width="56" height="56" viewBox="0 0 100 100" fill="none" stroke="#047857" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="20" y="20" width="60" height="60" rx="8" fill="#ecfdf5" />
      <polygon points="50,30 56,44 70,46 59,56 62,70 50,62 38,70 41,56 30,46 44,44" fill="#047857" />
    </svg>
  );
}

function getSymbolEmoji(symbolName?: string): string {
  const norm = (symbolName || '').toLowerCase();
  if (norm.includes('हाथ') || norm.includes('hand') || norm.includes('पंजा')) return '✋';
  if (norm.includes('पतंग') || norm.includes('kite')) return '🪁';
  if (norm.includes('बल्ला') || norm.includes('bat')) return '🏏';
  if (norm.includes('चाबी') || norm.includes('key')) return '🔑';
  if (norm.includes('झाड़ू') || norm.includes('broom')) return '🧹';
  if (norm.includes('कमल') || norm.includes('lotus')) return '🌸';
  return '🗳️';
}

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

export interface VoterSlipTemplateProps {
  voter?: VoterSlipData;
  config?: SlipConfig;
  forwardedRef?: React.RefObject<HTMLDivElement | null>;
  isInline?: boolean;
  isEditable?: boolean;
  onConfigChange?: (newConfig: SlipConfig) => void;
  onImageUpload?: (file: File, field: 'partySymbolImage' | 'candidateImage') => void;
  onRemoveImage?: (field: 'partySymbolImage' | 'candidateImage') => void;
}

interface InlineTextProps {
  value?: string;
  fallback?: string;
  isEditable?: boolean;
  onChange?: (val: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  className?: string;
  multiline?: boolean;
  rows?: number;
  title?: string;
}

const InlineText: React.FC<InlineTextProps> = ({
  value,
  fallback = '',
  isEditable = false,
  onChange,
  placeholder,
  style,
  inputStyle,
  className,
  multiline = false,
  rows = 2,
  title = '✏️ क्लिक करके सीधे बदलें',
}) => {
  const currentVal = value !== undefined && value !== null ? value : fallback;

  if (!isEditable) {
    return (
      <span style={style} className={className}>
        {currentVal || placeholder}
      </span>
    );
  }

  if (multiline) {
    return (
      <textarea
        value={currentVal}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        title={title}
        className={className}
        style={{
          width: '100%',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          fontWeight: 'inherit',
          color: 'inherit',
          textAlign: (style?.textAlign as any) || 'inherit',
          lineHeight: 'inherit',
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1.5px dashed #0284c7',
          borderRadius: '6px',
          padding: '4px 6px',
          outline: 'none',
          boxSizing: 'border-box',
          resize: 'vertical',
          transition: 'all 0.15s ease',
          ...style,
          ...inputStyle,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#0284c7';
          e.currentTarget.style.background = '#ffffff';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.2)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#0284c7';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    );
  }

  return (
    <input
      type="text"
      value={currentVal}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      title={title}
      className={className}
      style={{
        width: '100%',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'inherit',
        color: 'inherit',
        textAlign: (style?.textAlign as any) || 'inherit',
        letterSpacing: style?.letterSpacing || 'inherit',
        background: 'rgba(255, 255, 255, 0.85)',
        border: '1.5px dashed #0284c7',
        borderRadius: '5px',
        padding: '2px 6px',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'all 0.15s ease',
        ...style,
        ...inputStyle,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = '#0284c7';
        e.currentTarget.style.background = '#ffffff';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.2)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = '#0284c7';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
};

export const VoterSlipTemplate: React.FC<VoterSlipTemplateProps> = ({
  voter = {},
  config = {},
  forwardedRef,
  isInline = false,
  isEditable = false,
  onConfigChange,
  onImageUpload,
  onRemoveImage,
}) => {
  const merged: SlipConfig = { ...defaultSlipConfig, ...config };
  const symbolFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const candidateFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const updateField = (field: keyof SlipConfig, value: string) => {
    if (onConfigChange) {
      onConfigChange({
        ...merged,
        [field]: value,
      });
    }
  };
  
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
      {/* Hidden File Inputs for Direct On-Parchi Uploads */}
      {isEditable && (
        <>
          <input
            ref={symbolFileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onImageUpload) {
                onImageUpload(file, 'partySymbolImage');
              }
              e.target.value = '';
            }}
          />
          <input
            ref={candidateFileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onImageUpload) {
                onImageUpload(file, 'candidateImage');
              }
              e.target.value = '';
            }}
          />
        </>
      )}

      {/* Direct Editor Informative Banner */}
      {isEditable && (
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)',
          border: '1.5px solid #7dd3fc',
          borderRadius: '12px',
          padding: '10px 14px',
          marginBottom: '12px',
          fontSize: '12px',
          color: '#0369a1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>✨</span>
            <div>
              <strong style={{ color: '#0c4a6e' }}>प्रत्यक्ष पर्ची संपादन सक्रिय:</strong>{' '}
              किसी भी नाम, पार्टी, EVM नंबर या अपील पर क्लिक करके सीधे टाइप करें! फ़ोटो बदलने हेतु फ़ोटो पर क्लिक करें।
            </div>
          </div>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            background: '#0284c7',
            color: '#ffffff',
            padding: '2px 8px',
            borderRadius: '12px',
          }}>
            WYSIWYG Mode
          </span>
        </div>
      )}

      <div
        className="voter-slip-inner-card"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: isEditable ? '3px dashed #16a34a' : '3px solid #16a34a',
          padding: '18px 20px',
          boxShadow: '0 4px 20px -2px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* ================= 1. TOP HEADER SECTION ================= */}
        <div className="voter-slip-header-row" style={{ display: 'flex', alignItems: 'stretch', gap: '14px', justifyContent: 'space-between' }}>
          
          {/* Left: Party Symbol & Candidate Serial Box */}
          <div
            className="voter-slip-symbol-box"
            onClick={() => {
              if (isEditable) symbolFileInputRef.current?.click();
            }}
            style={{
              width: '110px',
              minWidth: '110px',
              border: isEditable ? '2px dashed #ea580c' : '2px solid #fb923c',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              overflow: 'hidden',
              background: '#fff',
              position: 'relative',
              cursor: isEditable ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
            }}
            title={isEditable ? '📷 चुनाव चिन्ह फोटो अपलोड करने के लिए क्लिक करें' : undefined}
          >
            {/* Top Serial Badge */}
            <div
              className="voter-slip-serial-badge"
              style={{
                width: '100%',
                background: '#ea580c',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 800,
                textAlign: 'center',
                padding: '4px 2px',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
              }}
            >
              <span>क्र. सं.</span>
              {isEditable ? (
                <input
                  type="text"
                  value={merged.evmNumber || '1'}
                  onChange={(e) => updateField('evmNumber', e.target.value)}
                  title="EVM क्रम संख्या बदलें"
                  style={{
                    width: '32px',
                    textAlign: 'center',
                    background: 'rgba(255, 255, 255, 0.3)',
                    border: '1px dashed #ffffff',
                    borderRadius: '4px',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '12px',
                    padding: '1px 2px',
                    outline: 'none',
                  }}
                />
              ) : (
                <span> {merged.evmNumber || '1'}</span>
              )}
            </div>

            {/* Symbol Image & Interactive Upload Prompt */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', position: 'relative', width: '100%' }}>
              {merged.partySymbolImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={merged.partySymbolImage}
                  alt={merged.partySymbolName || 'Party Symbol'}
                  style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                />
              ) : (
                /* Dynamic Symbol Vector (Lotus, Hand, Kite, Bat, Key, Broom, etc.) */
                renderSymbolVector(merged.partySymbolName)
              )}

              {isEditable && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.45)',
                    color: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.15s ease',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '6px',
                  }}
                  className="photo-overlay-prompt"
                >
                  <span>📷</span>
                  <span>फोटो बदलें</span>
                </div>
              )}

              {isEditable && merged.partySymbolImage && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onRemoveImage) onRemoveImage('partySymbolImage');
                    else updateField('partySymbolImage', '');
                  }}
                  title="फ़ोटो हटाएं (वेक्टर पर वापस जाएं)"
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    color: '#dc2626',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    zIndex: 10,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Bottom Symbol Caption (Directly Editable) */}
            <div
              style={{
                width: '90%',
                marginBottom: '6px',
                background: '#eff6ff',
                border: isEditable ? '1px dashed #3b82f6' : '1px solid #bfdbfe',
                borderRadius: '5px',
                color: '#ea580c',
                fontSize: '11px',
                fontWeight: 700,
                textAlign: 'center',
                padding: isEditable ? '0' : '2px 0',
                overflow: 'hidden',
              }}
            >
              <InlineText
                value={merged.partySymbolName}
                fallback="कमल का फूल"
                placeholder="चिन्ह नाम"
                isEditable={isEditable}
                onChange={(v) => updateField('partySymbolName', v)}
                title="चुनाव चिन्ह का नाम बदलें (उदा. कमल, हाथ, पतंग, बल्ला)"
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#ea580c',
                  textAlign: 'center',
                  padding: '2px 4px',
                  border: 'none',
                  background: 'transparent',
                }}
              />
            </div>
          </div>

          {/* Center: Party Headline & Candidate Name */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: '0 4px', minWidth: 0 }}>
            {/* Party Name & Appeal Headline */}
            <div style={{ marginBottom: '4px' }}>
              <InlineText
                value={merged.partyName}
                fallback="भारतीय जनता पार्टी (भाजपा) प्रत्याशी"
                placeholder="पार्टी का नाम"
                isEditable={isEditable}
                onChange={(v) => updateField('partyName', v)}
                title="पार्टी का नाम बदलें"
                className="voter-slip-party-headline"
                style={{
                  color: '#ea580c',
                  fontSize: '13px',
                  fontWeight: 700,
                  lineHeight: 1.35,
                  textAlign: 'center',
                  background: isEditable ? 'rgba(255, 237, 213, 0.45)' : 'transparent',
                  border: isEditable ? '1px dashed #ea580c' : 'none',
                  padding: isEditable ? '2px 4px' : '0',
                  borderRadius: '4px',
                }}
              />
              {isEditable ? (
                <div style={{ marginTop: '2px' }}>
                  <InlineText
                    value={merged.appealHeadline}
                    fallback="(1 नंबर पर कमल का फूल का बटन दबाएं)"
                    placeholder="अपील हैडलाइन"
                    isEditable={isEditable}
                    onChange={(v) => updateField('appealHeadline', v)}
                    title="शीर्षक अपील बदलें"
                    style={{
                      color: '#ea580c',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      textAlign: 'center',
                      background: 'rgba(255, 237, 213, 0.35)',
                      border: '1px dashed #fdba74',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              ) : (
                merged.appealHeadline && (
                  <span style={{ color: '#ea580c', fontSize: '13px', fontWeight: 700, marginLeft: '4px' }}>
                    {merged.appealHeadline}
                  </span>
                )
              )}
            </div>

            {/* Candidate Hindi & English Names */}
            <div style={{ margin: '2px 0 4px' }}>
              <InlineText
                value={merged.candidateName}
                fallback="प्रसन्न चंद मेहता"
                placeholder="प्रत्याशी नाम (हिंदी)"
                isEditable={isEditable}
                onChange={(v) => updateField('candidateName', v)}
                title="प्रत्याशी का हिंदी नाम बदलें"
                className="voter-slip-candidate-name"
                style={{
                  color: '#1e3a8a',
                  fontSize: '22px',
                  fontWeight: 900,
                  letterSpacing: '-0.3px',
                  lineHeight: 1.25,
                  textAlign: 'center',
                  background: isEditable ? 'rgba(219, 234, 254, 0.45)' : 'transparent',
                  border: isEditable ? '1.5px dashed #2563eb' : 'none',
                  padding: isEditable ? '2px 6px' : '0',
                  borderRadius: '6px',
                }}
              />
              {isEditable ? (
                <div style={{ marginTop: '3px' }}>
                  <InlineText
                    value={merged.candidateNameEn}
                    fallback="Prasann Chand Mehta"
                    placeholder="Candidate Name (English)"
                    isEditable={isEditable}
                    onChange={(v) => updateField('candidateNameEn', v)}
                    title="Candidate Name in English"
                    style={{
                      color: '#1e40af',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      textAlign: 'center',
                      background: 'rgba(219, 234, 254, 0.35)',
                      border: '1px dashed #60a5fa',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              ) : (
                merged.candidateNameEn && (
                  <span style={{ color: '#1e3a8a', fontSize: '20px', fontWeight: 800, marginLeft: '4px' }}>
                    ({merged.candidateNameEn})
                  </span>
                )
              )}
            </div>

            {/* Subtitle / Ward */}
            <div>
              <InlineText
                value={merged.subTitle}
                fallback={`मतदाता सूचना पर्ची (Voter Slip) · वार्ड नंबर ${ward} Jodhpur`}
                placeholder="उपशीर्षक / क्षेत्र (वार्ड नंबर)"
                isEditable={isEditable}
                onChange={(v) => updateField('subTitle', v)}
                title="उपशीर्षक / वार्ड विवरण बदलें"
                style={{
                  color: '#475569',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  textAlign: 'center',
                  background: isEditable ? 'rgba(241, 245, 249, 0.8)' : 'transparent',
                  border: isEditable ? '1px dashed #94a3b8' : 'none',
                  padding: isEditable ? '2px 6px' : '0',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>

          {/* Right: Candidate Photo Box & Interactive Upload */}
          <div
            className="voter-slip-photo-box"
            onClick={() => {
              if (isEditable) candidateFileInputRef.current?.click();
            }}
            style={{
              width: '105px',
              minWidth: '105px',
              height: '125px',
              border: isEditable ? '2px dashed #1e3a8a' : '2px solid #fb923c',
              borderRadius: '10px',
              overflow: 'hidden',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              cursor: isEditable ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
            }}
            title={isEditable ? '📷 प्रत्याशी फोटो अपलोड करने के लिए क्लिक करें' : undefined}
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

            {isEditable && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.45)',
                  color: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.15s ease',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '6px',
                }}
                className="photo-overlay-prompt"
              >
                <span>📷</span>
                <span>फोटो बदलें</span>
              </div>
            )}

            {isEditable && merged.candidateImage && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onRemoveImage) onRemoveImage('candidateImage');
                  else updateField('candidateImage', '');
                }}
                title="फ़ोटो हटाएं"
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#dc2626',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ================= 2. MIDDLE EVM / RIBBON STRIPE ================= */}
        <div
          className="voter-slip-ribbon"
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
              fontSize: '24px',
              fontWeight: 900,
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              flexShrink: 0,
            }}
          >
            {isEditable ? (
              <input
                type="text"
                value={merged.evmNumber || '1'}
                onChange={(e) => updateField('evmNumber', e.target.value)}
                title="EVM क्रम संख्या बदलें"
                style={{
                  width: '32px',
                  textAlign: 'center',
                  color: '#ea580c',
                  fontSize: '20px',
                  fontWeight: 900,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                }}
              />
            ) : (
              merged.evmNumber || '1'
            )}
          </div>

          {/* EVM Message */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.2px' }}>
              ईवीएम / मतपत्र क्रम संख्या: {merged.evmNumber || '1'}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 500, opacity: 0.95, lineHeight: 1.3, marginTop: '2px' }}>
              <InlineText
                value={merged.appealText}
                fallback={`वार्ड नंबर ${ward} से प्रत्याशी ${merged.candidateName || ''} को अपना अमूल्य वोट देकर भारी मतों से विजय बनाएं।`}
                placeholder="EVM पट्टी अपील संदेश"
                multiline={true}
                rows={2}
                isEditable={isEditable}
                onChange={(v) => updateField('appealText', v)}
                title="EVM पट्टी अपील संदेश बदलें"
                style={{
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 500,
                  background: isEditable ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
                  border: isEditable ? '1px dashed #fed7aa' : 'none',
                  borderRadius: '4px',
                  padding: isEditable ? '3px 6px' : '0',
                }}
              />
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
              <span>{getSymbolEmoji(merged.partySymbolName)}</span>
            )}
            <span>{merged.partySymbolName || 'कमल का फूल'}</span>
          </div>
        </div>

        {/* ================= 3. TWO BIG HIGHLIGHT METRIC CARDS ================= */}
        <div className="voter-slip-metric-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {/* Part Card */}
          <div
            className="voter-slip-metric-card"
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
            <div className="voter-slip-metric-num" style={{ color: '#1e3a8a', fontSize: '36px', fontWeight: 900, lineHeight: 1.1, marginTop: '4px' }}>
              {part}
            </div>
          </div>

          {/* Serial Card */}
          <div
            className="voter-slip-metric-card"
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
            <div className="voter-slip-metric-num" style={{ color: '#ea580c', fontSize: '36px', fontWeight: 900, lineHeight: 1.1, marginTop: '4px' }}>
              {serial}
            </div>
          </div>
        </div>

        {/* ================= 4. VOTER DETAILS TABLE ================= */}
        <div
          className="voter-slip-voter-table"
          style={{
            background: '#ffffff',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {isEditable && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}>
              <span>📋 <strong>मतदाता विवरण (सैंपल)</strong>: वास्तविक पर्चियों में यह डेटाबेस से स्वतः भरा जाता है</span>
              <span style={{ fontSize: '10px', color: '#0284c7', fontWeight: 600 }}>गतिशील (Dynamic)</span>
            </div>
          )}

          {/* Row 1: Voter Name */}
          <div
            className="voter-slip-voter-row"
            style={{
              display: 'flex',
              padding: '7px 4px',
              borderBottom: '1px dotted #cbd5e1',
              fontSize: '14px',
            }}
          >
            <span className="voter-slip-voter-label" style={{ width: '130px', color: '#334155', fontWeight: 600 }}>मतदाता का नाम:</span>
            <strong style={{ flex: 1, color: '#0f172a', fontWeight: 800 }}>{voterName}</strong>
          </div>

          {/* Row 2: Relative Name */}
          <div
            className="voter-slip-voter-row"
            style={{
              display: 'flex',
              padding: '7px 4px',
              borderBottom: '1px dotted #cbd5e1',
              fontSize: '14px',
            }}
          >
            <span className="voter-slip-voter-label" style={{ width: '130px', color: '#334155', fontWeight: 600 }}>{relLabel}:</span>
            <strong style={{ flex: 1, color: '#0f172a', fontWeight: 700 }}>{relativeName}</strong>
          </div>

          {/* Row 3: House No */}
          <div
            className="voter-slip-voter-row"
            style={{
              display: 'flex',
              padding: '7px 4px',
              borderBottom: '1px dotted #cbd5e1',
              fontSize: '14px',
            }}
          >
            <span className="voter-slip-voter-label" style={{ width: '130px', color: '#334155', fontWeight: 600 }}>मकान संख्या:</span>
            <strong style={{ flex: 1, color: '#0f172a', fontWeight: 800 }}>{house}</strong>
          </div>

          {/* Row 4: Age & Gender */}
          <div
            className="voter-slip-voter-row"
            style={{
              display: 'flex',
              padding: '7px 4px',
              borderBottom: '1px dotted #cbd5e1',
              fontSize: '14px',
            }}
          >
            <span className="voter-slip-voter-label" style={{ width: '130px', color: '#334155', fontWeight: 600 }}>आयु / लिंग:</span>
            <strong style={{ flex: 1, color: '#0f172a', fontWeight: 700 }}>{ageGender}</strong>
          </div>

          {/* Row 5: EPIC ID */}
          <div
            className="voter-slip-voter-row"
            style={{
              display: 'flex',
              padding: '7px 4px',
              fontSize: '14px',
              alignItems: 'center',
            }}
          >
            <span className="voter-slip-voter-label" style={{ width: '130px', color: '#334155', fontWeight: 600 }}>पहचान पत्र (EPIC):</span>
            <strong style={{ flex: 1, color: '#1d4ed8', fontWeight: 900, fontSize: '15px', letterSpacing: '0.6px' }}>{epic}</strong>
          </div>
        </div>

        {/* ================= 5. POLLING STATION CARD ================= */}
        <div
          className="voter-slip-polling-box"
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
          <div style={{ paddingLeft: isEditable ? '0' : '22px' }}>
            <InlineText
              value={merged.pollingStationFallback}
              fallback={pollingStation}
              placeholder="डिफ़ॉल्ट मतदान केंद्र पता / नाम"
              isEditable={isEditable}
              onChange={(v) => updateField('pollingStationFallback', v)}
              title="मतदान केंद्र विवरण बदलें"
              style={{
                color: '#0f172a',
                fontSize: '13.5px',
                fontWeight: 800,
                background: isEditable ? '#eff6ff' : 'transparent',
                border: isEditable ? '1px dashed #60a5fa' : 'none',
                padding: isEditable ? '4px 8px' : '0',
                borderRadius: '4px',
              }}
            />
          </div>
        </div>

        {/* ================= 6. BOTTOM APPEAL FOOTER ================= */}
        <div style={{ textAlign: 'center', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ color: '#ea580c', fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span>🗳️</span>
            <InlineText
              value={merged.footerAppeal}
              fallback={`${merged.partySymbolName || 'कमल'} का बटन दबाएं और भारी मतों से विजयी बनाएं`}
              placeholder="बॉटम अपील (Footer Banner)"
              isEditable={isEditable}
              onChange={(v) => updateField('footerAppeal', v)}
              title="बॉटम अपील बदलें"
              style={{
                color: '#ea580c',
                fontSize: '13px',
                fontWeight: 800,
                textAlign: 'center',
                background: isEditable ? '#fff7ed' : 'transparent',
                border: isEditable ? '1px dashed #f97316' : 'none',
                padding: isEditable ? '3px 8px' : '0',
                borderRadius: '4px',
              }}
            />
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

