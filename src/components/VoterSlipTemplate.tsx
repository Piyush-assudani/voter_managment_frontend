import React from 'react';
import { ImageCropModal } from './ImageCropModal';

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
  wardPollingStations?: Record<string, string>;
  useHeaderGraphic?: boolean;
  headerGraphicImage?: string;
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
  wardPollingStations: {},
  useHeaderGraphic: false,
  headerGraphicImage: '',
};



export interface VoterSlipData {
  _id?: string;
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
  phone?: string;
}

export interface VoterSlipTemplateProps {
  voter?: VoterSlipData;
  config?: SlipConfig;
  forwardedRef?: React.Ref<HTMLDivElement>;
  isInline?: boolean;
  isEditable?: boolean;
  perA4?: 4 | 8 | 12;
  onConfigChange?: (newConfig: SlipConfig) => void;
  onImageUpload?: (file: File | string, field: 'partySymbolImage' | 'candidateImage' | 'headerGraphicImage') => void;
  onRemoveImage?: (field: 'partySymbolImage' | 'candidateImage' | 'headerGraphicImage') => void;
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
  title = 'क्लिक करके सीधे बदलें',
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
          textAlign: (style?.textAlign as React.CSSProperties['textAlign']) || 'inherit',
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
        textAlign: (style?.textAlign as React.CSSProperties['textAlign']) || 'inherit',
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
  perA4,
  onConfigChange,
  onImageUpload,
  onRemoveImage,
}) => {
  const merged: SlipConfig = { ...defaultSlipConfig, ...config };
  const symbolFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const candidateFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const bannerFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [cropModalOpen, setCropModalOpen] = React.useState(false);
  const [cropImageSrc, setCropImageSrc] = React.useState('');
  const [cropField, setCropField] = React.useState<'partySymbolImage' | 'candidateImage' | 'headerGraphicImage'>('candidateImage');

  const handleFileSelectForCrop = (file: File, field: 'partySymbolImage' | 'candidateImage' | 'headerGraphicImage') => {
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropField(field);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedBase64: string) => {
    if (onImageUpload) {
      onImageUpload(croppedBase64, cropField);
    } else if (onConfigChange) {
      onConfigChange({
        ...merged,
        [cropField]: croppedBase64,
        ...(cropField === 'headerGraphicImage' ? { useHeaderGraphic: true } : {}),
      });
    }
  };

  const updateField = (field: keyof SlipConfig, value: string | boolean) => {
    if (onConfigChange) {
      onConfigChange({
        ...merged,
        [field]: value,
      });
    }
  };
  
  const formatName = (en?: string, hi?: string, fallback = '') => {
    const cleanEn = (en || '').trim();
    const cleanHi = (hi || '').trim();
    if (!cleanEn && !cleanHi) return fallback;

    // Strict Hindi priority: always prefer and show Hindi Devanagari text
    if (cleanHi) {
      return cleanHi;
    }
    return cleanEn || fallback;
  };

  const voterName = formatName(voter.nameEn, voter.nameHi, 'जबरा राम');

  const relLabel = voter.relationType === 'husband' || voter.relationType === 'पति' 
    ? 'पति' 
    : voter.relationType === 'mother' || voter.relationType === 'माता'
    ? 'माता'
    : 'पिता';

  const relativeName = formatName(voter.relativeNameEn, voter.relativeNameHi, 'नरिगा राम');

  const rawWard = (voter.wardNo || '82').toString().trim();
  const ward = rawWard.replace(/^(वार्ड|Ward)\s*/i, '').trim();
  const part = (voter.partNo || '1').toString().replace(/^(भाग|Part)\s*/i, '').trim();
  const serial = voter.serialNo ?? '1';
  const house = voter.houseNo || '279';
  const ageGender = `${voter.age || '28'} वर्ष | ${voter.gender || 'पुरुष'}`;
  const epic = voter.epic || 'RLJ1213180';

  // Helper to find ward polling station with resilient key normalization
  const getMappedStation = () => {
    if (!merged.wardPollingStations || typeof merged.wardPollingStations !== 'object') return null;
    const map = merged.wardPollingStations;
    if (map[ward] && map[ward].trim()) return map[ward].trim();
    if (map[rawWard] && map[rawWard].trim()) return map[rawWard].trim();
    if (map[`वार्ड ${ward}`] && map[`वार्ड ${ward}`].trim()) return map[`वार्ड ${ward}`].trim();
    if (map[`Ward ${ward}`] && map[`Ward ${ward}`].trim()) return map[`Ward ${ward}`].trim();
    const entry = Object.entries(map).find(
      ([k, v]) => k.replace(/^(वार्ड|Ward)\s*/i, '').trim() === ward && typeof v === 'string' && v.trim()
    );
    return entry ? entry[1].trim() : null;
  };

  const wardStation = getMappedStation();
  const pollingStation = wardStation 
    || (voter.boothName && voter.boothName.trim()) 
    || merged.pollingStationFallback 
    || `${part} - सामुदायिक भवन, जाटा बास, महामंदिर, जोधपुर`;



  const containerStyle: React.CSSProperties = isInline
    ? {
        width: '100%',
        maxWidth: '560px',
        margin: '0 auto',
        fontFamily: 'var(--font-noto-sans-devanagari), var(--font-anek-devanagari), "Noto Sans Devanagari", "Anek Devanagari", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0f172a',
        boxSizing: 'border-box',
      }
    : {
        width: '600px',
        maxWidth: '600px',
        padding: '16px',
        background: '#ffffff',
        fontFamily: 'var(--font-noto-sans-devanagari), var(--font-anek-devanagari), "Noto Sans Devanagari", "Anek Devanagari", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0f172a',
        boxSizing: 'border-box',
      };

  return (
    <div ref={forwardedRef} style={containerStyle} className="voter-slip-printable-card">
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
              if (file) handleFileSelectForCrop(file, 'partySymbolImage');
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
              if (file) handleFileSelectForCrop(file, 'candidateImage');
              e.target.value = '';
            }}
          />
          <input
            ref={bannerFileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelectForCrop(file, 'headerGraphicImage');
              e.target.value = '';
            }}
          />
        </>
      )}

      {/* Direct Editor Informative Banner & Mode Switcher */}
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
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div>
                <strong style={{ color: '#0c4a6e' }}>प्रत्यक्ष पर्ची संपादन सक्रिय:</strong>{' '}
                किसी भी नाम, पार्टी, EVM नंबर पर क्लिक करके टाइप करें, या पूरा हेडर ग्राफ़िक अपलोड करें।
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

          {/* Mode Switcher Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '6px', borderTop: '1px solid #bae6fd' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#075985' }}>
              हेडर डिज़ाइन मोड चुनें:
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => updateField('useHeaderGraphic', false)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: !merged.useHeaderGraphic ? '#0284c7' : '#ffffff',
                  color: !merged.useHeaderGraphic ? '#ffffff' : '#0369a1',
                  border: '1.5px solid #0284c7',
                  transition: 'all 0.15s ease',
                }}
              >
                अलग-अलग घटक (Symbol + Text + Photo)
              </button>
              <button
                type="button"
                onClick={() => updateField('useHeaderGraphic', true)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: merged.useHeaderGraphic ? '#0284c7' : '#ffffff',
                  color: merged.useHeaderGraphic ? '#ffffff' : '#0369a1',
                  border: '1.5px solid #0284c7',
                  transition: 'all 0.15s ease',
                }}
              >
                पूरा हेडर ग्राफ़िक (Single Custom Banner)
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="voter-slip-inner-card"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: isEditable ? '3px dashed #16a34a' : '3px solid #16a34a',
          padding: '18px 20px 22px 20px',
          boxShadow: '0 4px 20px -2px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {/* ================= 1. TOP HEADER SECTION ================= */}
        {merged.useHeaderGraphic ? (
          <div
            className="voter-slip-header-banner-card"
            style={{
              width: '100%',
              minHeight: '120px',
              border: isEditable ? '2px dashed #0284c7' : 'none',
              borderRadius: '10px',
              background: '#f8fafc',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {merged.headerGraphicImage ? (
              <div style={{ width: '100%', position: 'relative' }}>
                <img
                  src={merged.headerGraphicImage}
                  alt="Campaign Header Graphic"
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '170px',
                    objectFit: 'contain',
                    display: 'block',
                    borderRadius: '8px',
                  }}
                />
                {isEditable && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      display: 'flex',
                      gap: '6px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => bannerFileInputRef.current?.click()}
                      title="ग्राफ़िक बदलें"
                      style={{
                        background: '#0284c7',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      }}
                    >
                      ग्राफ़िक बदलें
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (onRemoveImage) onRemoveImage('headerGraphicImage');
                        else updateField('headerGraphicImage', '');
                      }}
                      title="ग्राफ़िक हटाएं"
                      style={{
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      × हटाएं
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => {
                  if (isEditable) bannerFileInputRef.current?.click();
                }}
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: isEditable ? 'pointer' : 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  width: '100%',
                }}
              >
                <div style={{ color: '#0284c7', marginBottom: '2px' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0369a1' }}>
                  संपूर्ण हेडर ग्राफ़िक (Full Banner) अपलोड करें
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', maxWidth: '420px', lineHeight: 1.35 }}>
                  Canva या Photoshop से डिज़ाइन किया हुआ पूरा हेडर बैनर (चुनाव चिन्ह, प्रत्याशी फ़ोटो, नाम व पार्टी सहित) यहाँ एक साथ अपलोड करें।
                </div>
                {isEditable && (
                  <button
                    type="button"
                    style={{
                      marginTop: '6px',
                      padding: '7px 16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: '#0284c7',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      bannerFileInputRef.current?.click();
                    }}
                  >
                    बैनर इमेज चुनें
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="voter-slip-header-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', justifyContent: 'space-between' }}>
            {/* Left: Party Symbol & Candidate Serial Box (Strictly Upload-Only, Identical Size with Photo Box) */}
            <div
              className="voter-slip-symbol-box"
            onClick={() => {
              if (isEditable) symbolFileInputRef.current?.click();
            }}
            style={{
              width: '95px',
              minWidth: '80px',
              maxWidth: '100px',
              height: '124px',
              minHeight: '120px',
              maxHeight: '126px',
              boxSizing: 'border-box',
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
              flexShrink: 0,
            }}
            title={isEditable ? 'चुनाव चिन्ह फोटो अपलोड करने के लिए क्लिक करें' : undefined}
          >
            {/* Top Serial Badge */}
            <div
              className="voter-slip-serial-badge"
              style={{
                width: '100%',
                height: '24px',
                boxSizing: 'border-box',
                background: '#ea580c',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: 800,
                textAlign: 'center',
                padding: '0 4px',
                letterSpacing: 'normal',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                flexShrink: 0,
              }}
            >
              <span>क्र. सं.</span>
              {isEditable ? (
                <input
                  type="text"
                  value={merged.evmNumber || '1'}
                  onChange={(e) => updateField('evmNumber', e.target.value)}
                  title="EVM क्रम संख्या बदलें"
                  className="voter-slip-evm-input"
                  style={{
                    width: '28px',
                    textAlign: 'center',
                    background: 'rgba(255, 255, 255, 0.3)',
                    border: '1px dashed #ffffff',
                    borderRadius: '3px',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '11.5px',
                    padding: '0 2px',
                    outline: 'none',
                  }}
                />
              ) : (
                <span> {merged.evmNumber || '1'}</span>
              )}
            </div>

            {/* Symbol Image & Interactive Upload Prompt (Upload-Only, No Auto Vectors) */}
            <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', position: 'relative', overflow: 'hidden' }}>
              {merged.partySymbolImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={merged.partySymbolImage}
                  alt={merged.partySymbolName || 'Party Symbol'}
                  style={{ maxWidth: '100%', maxHeight: '66px', width: 'auto', height: 'auto', objectFit: 'contain' }}
                />
              ) : (
                /* Upload placeholder only - NO auto-generated vectors! */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '2px' }}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#ea580c', marginTop: '2px', lineHeight: 1.1 }}>चिन्ह फोटो</span>
                  {isEditable && (
                    <span style={{ fontSize: '8.5px', color: '#64748b', marginTop: '1px' }}>अपलोड करें</span>
                  )}
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
                    gap: '2px',
                  }}
                  className="photo-overlay-prompt"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>{merged.partySymbolImage ? 'फोटो बदलें' : 'फोटो अपलोड'}</span>
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
                  title="चिन्ह फ़ोटो हटाएं"
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    color: '#dc2626',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    zIndex: 10,
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {/* Bottom Symbol Caption (Directly Editable) */}
            <div
              className="voter-slip-symbol-caption"
              style={{
                width: '92%',
                minHeight: '26px',
                height: 'auto',
                boxSizing: 'border-box',
                marginBottom: '4px',
                background: '#eff6ff',
                border: isEditable ? '1px dashed #3b82f6' : '1px solid #bfdbfe',
                borderRadius: '5px',
                color: '#ea580c',
                fontSize: '10.5px',
                fontWeight: 700,
                textAlign: 'center',
                padding: '2px 4px',
                overflow: 'visible',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                lineHeight: 1.25,
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
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: '#ea580c',
                  textAlign: 'center',
                  padding: 0,
                  margin: 0,
                  border: 'none',
                  background: 'transparent',
                  lineHeight: 1.25,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                }}
              />
            </div>
          </div>

          {/* Center: Party Headline & Candidate Name */}
          <div className="voter-slip-center-column" style={{ flex: 1, minHeight: '124px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 8px', minWidth: '150px', overflow: 'visible' }}>
            {isEditable ? (
              <>
                <div style={{ display: 'flex', gap: '4px', width: '100%', marginBottom: '2px' }}>
                  <InlineText
                    value={merged.partyName}
                    fallback="भारतीय जनता पार्टी (भाजपा) प्रत्याशी"
                    placeholder="पार्टी का नाम"
                    isEditable={true}
                    onChange={(v) => updateField('partyName', v)}
                    title="पार्टी का नाम बदलें"
                    className="voter-slip-party-headline"
                    style={{
                      flex: 1,
                      color: '#ea580c',
                      fontSize: '12px',
                      fontWeight: 700,
                      lineHeight: 1.25,
                      textAlign: 'center',
                      background: 'rgba(255, 237, 213, 0.45)',
                      border: '1px dashed #ea580c',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  />
                  <InlineText
                    value={merged.appealHeadline}
                    fallback="(1 नंबर पर बटन दबाएं)"
                    placeholder="अपील"
                    isEditable={true}
                    onChange={(v) => updateField('appealHeadline', v)}
                    title="शीर्षक अपील बदलें"
                    className="voter-slip-appeal-headline"
                    style={{
                      color: '#ea580c',
                      fontSize: '11px',
                      fontWeight: 700,
                      textAlign: 'center',
                      background: 'rgba(255, 237, 213, 0.35)',
                      border: '1px dashed #fdba74',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%', margin: '2px 0' }}>
                  <InlineText
                    value={merged.candidateName}
                    fallback="प्रसन्न चंद मेहता"
                    placeholder="प्रत्याशी नाम (हिंदी)"
                    isEditable={true}
                    onChange={(v) => updateField('candidateName', v)}
                    title="प्रत्याशी का हिंदी नाम बदलें"
                    className="voter-slip-candidate-name"
                    style={{
                      width: '100%',
                      color: '#1e3a8a',
                      fontSize: '19px',
                      fontWeight: 900,
                      letterSpacing: 'normal',
                      lineHeight: 1.25,
                      textAlign: 'center',
                      background: 'rgba(219, 234, 254, 0.45)',
                      border: '1.5px dashed #2563eb',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  />
                  <InlineText
                    value={merged.candidateNameEn}
                    fallback="Prasann Chand Mehta"
                    placeholder="Candidate Name (English)"
                    isEditable={true}
                    onChange={(v) => updateField('candidateNameEn', v)}
                    title="Candidate Name in English"
                    className="voter-slip-candidate-name-en"
                    style={{
                      width: '100%',
                      color: '#2563eb',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      textAlign: 'center',
                      background: 'rgba(219, 234, 254, 0.35)',
                      border: '1px dashed #60a5fa',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  />
                </div>
                <div style={{ width: '100%' }}>
                  <InlineText
                    value={merged.subTitle}
                    fallback={`मतदाता पर्ची (Voter Slip) · वार्ड नं. ${ward}`}
                    placeholder="उपशीर्षक / क्षेत्र"
                    isEditable={true}
                    onChange={(v) => updateField('subTitle', v)}
                    title="उपशीर्षक बदलें"
                    className="voter-slip-subtitle"
                    style={{
                      color: '#475569',
                      fontSize: '11px',
                      fontWeight: 600,
                      textAlign: 'center',
                      background: 'rgba(241, 245, 249, 0.8)',
                      border: '1px dashed #94a3b8',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Line 1: Party Name */}
                <div
                  className="voter-slip-party-headline"
                  style={{
                    color: '#ea580c',
                    fontSize: '13px',
                    fontWeight: 700,
                    lineHeight: 1.35,
                    textAlign: 'center',
                    wordBreak: 'keep-all',
                    maxWidth: '100%',
                  }}
                >
                  {merged.partyName || 'भारतीय जनता पार्टी (भाजपा) प्रत्याशी'}
                </div>

                {/* Line 2: Appeal Headline */}
                {merged.appealHeadline && (
                  <div
                    className="voter-slip-appeal-headline"
                    style={{
                      color: '#c2410c',
                      fontSize: '12px',
                      fontWeight: 700,
                      lineHeight: 1.35,
                      textAlign: 'center',
                      wordBreak: 'keep-all',
                      maxWidth: '100%',
                      marginTop: '2px',
                    }}
                  >
                    {merged.appealHeadline}
                  </div>
                )}

                {/* Line 3: Candidate Name (Hindi Prominent + English Subtitle) */}
                <div
                  className="voter-slip-candidate-name"
                  style={{
                    color: '#1e3a8a',
                    margin: '4px 0',
                    textAlign: 'center',
                    wordBreak: 'keep-all',
                    maxWidth: '100%',
                  }}
                >
                  <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: 'normal', color: '#1e3a8a', lineHeight: 1.45, overflow: 'visible' }}>
                    {merged.candidateName || 'प्रत्याशी नाम'}
                  </div>
                  {merged.candidateNameEn && (
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#2563eb', letterSpacing: '0.2px', marginTop: '2px', lineHeight: 1.4 }}>
                      ({merged.candidateNameEn})
                    </div>
                  )}
                </div>

                {/* Line 4: Subtitle */}
                <div
                  className="voter-slip-subtitle"
                  style={{
                    color: '#475569',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    lineHeight: 1.35,
                    textAlign: 'center',
                    wordBreak: 'keep-all',
                    maxWidth: '100%',
                    marginTop: '2px',
                  }}
                >
                  {merged.subTitle || `मतदाता सूचना पर्ची (Voter Slip) · वार्ड नं. ${ward}`}
                </div>
              </>
            )}
          </div>

          {/* Right: Candidate Photo Box (Strictly Identical Size with Left Symbol Box) */}
          <div
            className="voter-slip-photo-box"
            onClick={() => {
              if (isEditable) candidateFileInputRef.current?.click();
            }}
            style={{
              width: '95px',
              minWidth: '80px',
              maxWidth: '100px',
              height: '124px',
              minHeight: '120px',
              maxHeight: '126px',
              boxSizing: 'border-box',
              border: isEditable ? '2px dashed #ea580c' : '2px solid #fb923c',
              borderRadius: '10px',
              overflow: 'hidden',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              cursor: isEditable ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            title={isEditable ? 'प्रत्याशी फोटो अपलोड करने के लिए क्लिक करें' : undefined}
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '4px' }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#ea580c', marginTop: '2px', lineHeight: 1.1 }}>प्रत्याशी फोटो</span>
                {isEditable && (
                  <span style={{ fontSize: '8.5px', color: '#64748b', marginTop: '1px' }}>अपलोड करें</span>
                )}
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>{merged.candidateImage ? 'फोटो बदलें' : 'फोटो अपलोड'}</span>
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
                title="प्रत्याशी फ़ोटो हटाएं"
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#dc2626',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

        {/* ================= 2. MIDDLE EVM / RIBBON STRIPE ================= */}
        <div
          className="voter-slip-ribbon"
          style={{
            background: 'linear-gradient(90deg, #ea580c 0%, #c2410c 14%, #1d4ed8 40%, #1e3a8a 100%)',
            borderRadius: '10px',
            padding: '12px 14px',
            minHeight: '68px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#ffffff',
            boxSizing: 'border-box',
            overflow: 'visible',
          }}
        >
          {/* Big EVM Number Badge */}
          <div
            className="voter-slip-ribbon-evm-badge"
            style={{
              background: '#ffffff',
              color: '#ea580c',
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 900,
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              flexShrink: 0,
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              lineHeight: 1,
              boxSizing: 'border-box',
              padding: 0,
              overflow: 'hidden',
            }}
          >
            {isEditable ? (
              <input
                type="text"
                value={merged.evmNumber || '1'}
                onChange={(e) => updateField('evmNumber', e.target.value)}
                title="EVM क्रम संख्या बदलें"
                className="voter-slip-ribbon-evm-input"
                style={{
                  width: '100%',
                  height: '100%',
                  textAlign: 'center',
                  color: '#ea580c',
                  fontSize: '22px',
                  fontWeight: 900,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: 0,
                  margin: 0,
                  lineHeight: 1,
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            ) : (
              <span style={{ lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: 0, padding: 0 }}>
                {merged.evmNumber || '1'}
              </span>
            )}
          </div>

          {/* EVM Message */}
          <div
            className="voter-slip-ribbon-content"
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '2px',
              fontFamily: 'var(--font-anek-devanagari), var(--font-noto-sans-devanagari), "Anek Devanagari", "Noto Sans Devanagari", sans-serif',
              overflow: 'visible',
            }}
          >
            <div
              style={{
                fontSize: '12.5px',
                fontWeight: 800,
                letterSpacing: 'normal',
                lineHeight: 1.35,
                color: '#ffffff',
                textRendering: 'geometricPrecision',
                margin: 0,
                padding: 0,
              }}
            >
              ईवीएम / मतपत्र क्रम संख्या: {merged.evmNumber || '1'}
            </div>
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: 800,
                opacity: 0.98,
                lineHeight: 1.35,
                margin: 0,
                padding: 0,
                letterSpacing: 'normal',
                color: '#ffffff',
                textRendering: 'geometricPrecision',
                overflow: 'visible',
              }}
            >
              {isEditable ? (
                <InlineText
                  value={merged.appealText}
                  fallback={merged.candidateName || `वार्ड नं. ${ward} से प्रत्याशी`}
                  placeholder="EVM पट्टी संदेश"
                  isEditable={true}
                  onChange={(v) => updateField('appealText', v)}
                  title="EVM पट्टी संदेश बदलें"
                  style={{
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px dashed #fed7aa',
                    borderRadius: '4px',
                    padding: '2px 4px',
                    lineHeight: 1.3,
                  }}
                />
              ) : (
                merged.candidateName || merged.appealText || `वार्ड नं. ${ward} से प्रत्याशी`
              )}
            </div>
          </div>

          {/* Right Symbol Mini Pill */}
          <div
            className="voter-slip-ribbon-pill"
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '6px 12px',
              minHeight: '28px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#ea580c',
              fontSize: '11.5px',
              fontWeight: 700,
              flexShrink: 0,
              overflow: 'visible',
            }}
          >
            {merged.partySymbolImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={merged.partySymbolImage} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} />
            )}
            <span style={{ lineHeight: 1.25, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
              {merged.partySymbolName || 'कमल का फूल'}
            </span>
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
              padding: '10px 12px 14px 12px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <div className="voter-slip-metric-label" style={{ color: '#1e3a8a', fontSize: '12px', fontWeight: 700, letterSpacing: 'normal', lineHeight: 1.2, marginBottom: '2px' }}>
              भाग संख्या (PART)
            </div>
            <div className="voter-slip-metric-num" style={{ color: '#1e3a8a', fontSize: '34px', fontWeight: 900, lineHeight: 1.15, margin: 0, padding: '0 0 2px 0' }}>
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
              padding: '10px 12px 14px 12px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <div className="voter-slip-metric-label" style={{ color: '#ea580c', fontSize: '12px', fontWeight: 700, letterSpacing: 'normal', lineHeight: 1.2, marginBottom: '2px' }}>
              क्रम संख्या (SL. NO.)
            </div>
            <div className="voter-slip-metric-num" style={{ color: '#ea580c', fontSize: '34px', fontWeight: 900, lineHeight: 1.15, margin: 0, padding: '0 0 2px 0' }}>
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
              <span><strong>मतदाता विवरण (सैंपल)</strong>: वास्तविक पर्चियों में यह डेटाबेस से स्वतः भरा जाता है</span>
              <span style={{ fontSize: '10px', color: '#0284c7', fontWeight: 600 }}>गतिशील (Dynamic)</span>
            </div>
          )}

          {/* Row 1: Voter Name */}
          <div
            className="voter-slip-voter-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 4px',
              borderBottom: '1px dotted #cbd5e1',
              fontSize: '14px',
              lineHeight: 1.5,
            }}
          >
            <span className="voter-slip-voter-label" style={{ width: '165px', minWidth: '165px', flexShrink: 0, color: '#334155', fontWeight: 600 }}>मतदाता का नाम:</span>
            <strong className="voter-slip-voter-value" style={{ flex: 1, color: '#0f172a', fontWeight: 800 }}>{voterName}</strong>
          </div>

          {/* Row 2: Relative Name */}
          <div
            className="voter-slip-voter-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 4px',
              borderBottom: '1px dotted #cbd5e1',
              fontSize: '14px',
              lineHeight: 1.4,
            }}
          >
            <span className="voter-slip-voter-label" style={{ width: '165px', minWidth: '165px', flexShrink: 0, color: '#334155', fontWeight: 600 }}>{relLabel}:</span>
            <strong className="voter-slip-voter-value" style={{ flex: 1, color: '#0f172a', fontWeight: 700 }}>{relativeName}</strong>
          </div>

          {/* Row 3: House No */}
          <div
            className="voter-slip-voter-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 4px',
              borderBottom: '1px dotted #cbd5e1',
              fontSize: '14px',
              lineHeight: 1.4,
            }}
          >
            <span className="voter-slip-voter-label" style={{ width: '165px', minWidth: '165px', flexShrink: 0, color: '#334155', fontWeight: 600 }}>मकान संख्या:</span>
            <strong className="voter-slip-voter-value" style={{ flex: 1, color: '#0f172a', fontWeight: 800 }}>{house}</strong>
          </div>

          {/* Row 4: Age & Gender */}
          <div
            className="voter-slip-voter-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 4px',
              borderBottom: '1px dotted #cbd5e1',
              fontSize: '14px',
              lineHeight: 1.4,
            }}
          >
            <span className="voter-slip-voter-label" style={{ width: '165px', minWidth: '165px', flexShrink: 0, color: '#334155', fontWeight: 600 }}>आयु / लिंग:</span>
            <strong className="voter-slip-voter-value" style={{ flex: 1, color: '#0f172a', fontWeight: 700 }}>{ageGender}</strong>
          </div>

          {/* Row 5: EPIC ID */}
          <div
            className="voter-slip-voter-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 4px',
              borderBottom: '1px dotted #cbd5e1',
              fontSize: '14px',
              lineHeight: 1.4,
            }}
          >
            <span className="voter-slip-voter-label" style={{ width: '165px', minWidth: '165px', flexShrink: 0, color: '#334155', fontWeight: 600 }}>पहचान पत्र (EPIC):</span>
            <strong className="voter-slip-voter-value" style={{ flex: 1, color: '#1d4ed8', fontWeight: 900, fontSize: '15px', letterSpacing: '0.6px' }}>{epic}</strong>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ea580c', fontSize: '12.5px', fontWeight: 700 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>मतदान केंद्र (Polling Station):</span>
            </div>
            {wardStation && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#0369a1',
                  background: '#e0f2fe',
                  border: '1px solid #bae6fd',
                  padding: '1px 6px',
                  borderRadius: '4px',
                }}
              >
                वार्ड {ward} विशेष केंद्र
              </span>
            )}
          </div>
          <div style={{ paddingLeft: isEditable ? '0' : '20px' }}>
            <InlineText
              value={isEditable ? (wardStation || merged.pollingStationFallback) : pollingStation}
              fallback={pollingStation}
              placeholder="मतदान केंद्र पता / नाम"
              isEditable={isEditable}
              onChange={(v) => {
                if (ward) {
                  const updatedWardStations = {
                    ...(merged.wardPollingStations || {}),
                    [ward]: v,
                  };
                  if (onConfigChange) {
                    onConfigChange({
                      ...merged,
                      wardPollingStations: updatedWardStations,
                    });
                  }
                } else {
                  updateField('pollingStationFallback', v);
                }
              }}
              title={ward ? `वार्ड ${ward} का मतदान केंद्र बदलें` : 'मतदान केंद्र विवरण बदलें'}
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
        <div className="voter-slip-footer-appeal" style={{ textAlign: 'center', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ color: '#ea580c', fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
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
          </div>
          <div style={{ color: '#475569', fontSize: '11px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span>कृपया मतदान के दिन अपना पहचान पत्र (Voter ID / आधार कार्ड) साथ लाएं।</span>
          </div>
        </div>

      </div>

      {/* Meta-style Interactive Image Crop Modal for On-Parchi Direct Uploads */}
      {isEditable && (
        <ImageCropModal
          isOpen={cropModalOpen}
          imageSrc={cropImageSrc}
          title={
            cropField === 'candidateImage'
              ? 'प्रत्याशी फ़ोटो क्रॉप करें (Crop Candidate Photo)'
              : cropField === 'partySymbolImage'
              ? 'चुनाव चिन्ह फ़ोटो क्रॉप करें (Crop Symbol Photo)'
              : 'हेडर ग्राफ़िक क्रॉप करें (Crop Header Graphic)'
          }
          subtitle="फोटो को सही स्थिति में लाने के लिए ड्रैग करें, ज़ूम स्लाइडर से आकार सेट करें और एरिया चुनें।"
          initialAspectRatio={cropField === 'headerGraphicImage' ? 0 : 1}
          onCropComplete={handleCropComplete}
          onClose={() => setCropModalOpen(false)}
        />
      )}
    </div>
  );
};

