'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Check,
  Trash2,
  Edit3,
  Plus,
  Eye,
  Building,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { SlipConfig } from './VoterSlipTemplate';

export interface WardPollingStationEditorProps {
  config: SlipConfig;
  onChange: (updatedConfig: SlipConfig) => void;
  availableWards?: string[];
  selectedPreviewWard?: string;
  onPreviewWardChange?: (ward: string) => void;
  organizationName?: string;
  isCompact?: boolean;
}

export const WardPollingStationEditor: React.FC<WardPollingStationEditorProps> = ({
  config,
  onChange,
  availableWards = [],
  selectedPreviewWard,
  onPreviewWardChange,
  organizationName = 'क्लाइंट',
  isCompact = false,
}) => {
  const wardPollingStations = useMemo(() => {
    return (config.wardPollingStations && typeof config.wardPollingStations === 'object')
      ? { ...config.wardPollingStations }
      : {};
  }, [config.wardPollingStations]);

  // Combine wards from props + any already mapped wards
  const allKnownWards = useMemo(() => {
    const set = new Set<string>();
    availableWards.forEach((w) => {
      if (w) set.add(String(w).trim().replace(/^(वार्ड|Ward)\s*/i, '').trim());
    });
    Object.keys(wardPollingStations).forEach((w) => {
      if (w) set.add(String(w).trim().replace(/^(वार्ड|Ward)\s*/i, '').trim());
    });
    return Array.from(set).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [availableWards, wardPollingStations]);

  // Selected ward in dropdown or typed
  const [selectedDropdownWard, setSelectedDropdownWard] = useState<string>('');
  const [typedWard, setTypedWard] = useState<string>('');
  const [stationAddress, setStationAddress] = useState<string>('');
  const [statusNotice, setStatusNotice] = useState<string>('');
  const [editingWardKey, setEditingWardKey] = useState<string | null>(null);

  // Initialize or synchronize typedWard when dropdown changes
  const handleDropdownChange = (val: string) => {
    setSelectedDropdownWard(val);
    if (val === '__custom__') {
      setTypedWard('');
      setStationAddress('');
      setEditingWardKey(null);
    } else if (val) {
      setTypedWard(val);
      // Auto-populate existing station if already mapped
      const existing = wardPollingStations[val] || '';
      setStationAddress(existing);
      setEditingWardKey(val);
      onPreviewWardChange?.(val);
    }
  };

  const handleTypedWardChange = (val: string) => {
    setTypedWard(val);
    const clean = val.trim().replace(/^(वार्ड|Ward)\s*/i, '').trim();
    if (clean && wardPollingStations[clean]) {
      setStationAddress(wardPollingStations[clean]);
      setEditingWardKey(clean);
      setSelectedDropdownWard(clean);
    } else {
      setEditingWardKey(null);
      if (allKnownWards.includes(clean)) {
        setSelectedDropdownWard(clean);
      } else {
        setSelectedDropdownWard('__custom__');
      }
    }
    if (clean) {
      onPreviewWardChange?.(clean);
    }
  };

  const handleSaveWardStation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = typedWard.trim().replace(/^(वार्ड|Ward)\s*/i, '').trim();
    if (!clean) {
      setStatusNotice('कृपया पहले वार्ड नंबर चुनें या टाइप करें!');
      setTimeout(() => setStatusNotice(''), 3000);
      return;
    }
    if (!stationAddress.trim()) {
      setStatusNotice(`कृपया वार्ड ${clean} के लिए मतदान केंद्र का पता/नाम दर्ज करें!`);
      setTimeout(() => setStatusNotice(''), 3000);
      return;
    }

    const updated = {
      ...wardPollingStations,
      [clean]: stationAddress.trim(),
    };

    onChange({
      ...config,
      wardPollingStations: updated,
    });

    onPreviewWardChange?.(clean);
    setStatusNotice(`वार्ड ${clean} का मतदान केंद्र सफलतापूर्वक सुरक्षित हुआ!`);
    setEditingWardKey(clean);
    setTimeout(() => setStatusNotice(''), 3500);
  };

  const handleDeleteWard = (wardToDelete: string) => {
    const updated = { ...wardPollingStations };
    delete updated[wardToDelete];

    onChange({
      ...config,
      wardPollingStations: updated,
    });

    if (typedWard === wardToDelete) {
      setStationAddress('');
      setEditingWardKey(null);
    }
    setStatusNotice(`वार्ड ${wardToDelete} का केंद्र हटा दिया गया।`);
    setTimeout(() => setStatusNotice(''), 3000);
  };

  const handleEditWard = (wardToEdit: string) => {
    setTypedWard(wardToEdit);
    setSelectedDropdownWard(wardToEdit);
    setStationAddress(wardPollingStations[wardToEdit] || '');
    setEditingWardKey(wardToEdit);
    onPreviewWardChange?.(wardToEdit);
  };

  const configuredWardList = useMemo(() => {
    return Object.entries(wardPollingStations)
      .filter(([k, v]) => k && v && typeof v === 'string')
      .sort((a, b) => {
        const na = parseInt(a[0], 10);
        const nb = parseInt(b[0], 10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a[0].localeCompare(b[0]);
      });
  }, [wardPollingStations]);

  return (
    <div
      className="ward-polling-editor-container"
      style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1.5px solid #e2e8f0',
        padding: isCompact ? '14px' : '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 4px 15px -3px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* 1. Header Section */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MapPin size={17} />
            </span>
            <h3 style={{ fontSize: '15.5px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              वार्ड अनुसार मतदान केंद्र (Ward-wise Polling Stations)
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#0284c7',
                background: '#e0f2fe',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              {configuredWardList.length} वार्ड मैप हैं
            </span>
          </div>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, lineHeight: 1.45 }}>
            एक ही क्लाइंट (<strong>{organizationName}</strong>) के अलग-अलग वार्डों के लिए अलग-अलग मतदान केंद्र सेट करें। पर्ची निकालते समय वोटर के वार्ड के अनुसार सही मतदान केंद्र अपने आप छपेगा।
          </p>
        </div>

        {/* Live Preview Ward Switcher Pill */}
        {onPreviewWardChange && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              padding: '6px 12px',
              fontSize: '12px',
            }}
          >
            <Eye size={14} color="#0284c7" />
            <span style={{ fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>प्रीव्यू वार्ड:</span>
            <select
              value={selectedPreviewWard || ''}
              onChange={(e) => onPreviewWardChange(e.target.value)}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#0284c7',
                border: '1px solid #93c5fd',
                borderRadius: '6px',
                padding: '3px 8px',
                background: '#eff6ff',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {allKnownWards.map((w) => (
                <option key={`prev-${w}`} value={w}>
                  वार्ड {w} {wardPollingStations[w] ? '• केंद्र सेट' : ''}
                </option>
              ))}
              {selectedPreviewWard && !allKnownWards.includes(selectedPreviewWard) && (
                <option value={selectedPreviewWard}>वार्ड {selectedPreviewWard}</option>
              )}
            </select>
          </div>
        )}
      </div>

      {/* Success / Info Feedback Banner */}
      {statusNotice && (
        <div
          style={{
            background: statusNotice.includes('कृपया') ? '#fffbeb' : '#ecfdf5',
            border: `1.5px solid ${statusNotice.includes('कृपया') ? '#fde68a' : '#a7f3d0'}`,
            color: statusNotice.includes('कृपया') ? '#92400e' : '#047857',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '12.5px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* 2. Interactive Input Dock: Ward Selector + Direct Writing + Station Input */}
      <div
        style={{
          background: '#f8fafc',
          border: '1.5px solid #cbd5e1',
          borderRadius: '12px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} color="#ea580c" />
          <span>वार्ड चुनें या नया वार्ड लिखें और मतदान केंद्र असाइन करें:</span>
        </div>

        {/* Form Inputs Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
            gap: '12px',
            alignItems: 'start',
          }}
        >
          {/* Column A: Ward Dropdown */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
            <span>1. वार्ड ड्रॉपडाउन से चुनें:</span>
            <select
              value={selectedDropdownWard}
              onChange={(e) => handleDropdownChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1.5px solid #94a3b8',
                background: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none',
              }}
            >
              <option value="">-- उपलब्ध वार्ड चुनें --</option>
              {allKnownWards.map((w) => {
                const isMapped = !!wardPollingStations[w];
                return (
                  <option key={`opt-${w}`} value={w}>
                    वार्ड {w} {isMapped ? '✓ (केंद्र मौजूद है)' : ''}
                  </option>
                );
              })}
              <option value="__custom__">✏️ + नया वार्ड खुद लिखें (Type Custom Ward)...</option>
            </select>
          </label>

          {/* Column B: Direct Writing Input */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
            <span>2. अथवा वार्ड नंबर लिखें:</span>
            <input
              type="text"
              value={typedWard}
              onChange={(e) => handleTypedWardChange(e.target.value)}
              placeholder="उदा. 82 या 14"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #94a3b8',
                background: '#ffffff',
                fontSize: '13.5px',
                fontWeight: 700,
                color: '#0f172a',
                outline: 'none',
              }}
            />
          </label>
        </div>

        {/* Quick Ward Chips for 1-Click Fast Selection */}
        {allKnownWards.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>त्वरित वार्ड:</span>
            {allKnownWards.map((w) => {
              const isSelected = typedWard === w;
              const hasStation = !!wardPollingStations[w];
              return (
                <button
                  key={`chip-${w}`}
                  type="button"
                  onClick={() => handleEditWard(w)}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '20px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: isSelected ? '1.5px solid #2563eb' : hasStation ? '1px solid #86efac' : '1px solid #cbd5e1',
                    background: isSelected ? '#eff6ff' : hasStation ? '#f0fdf4' : '#ffffff',
                    color: isSelected ? '#1d4ed8' : hasStation ? '#15803d' : '#475569',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  title={hasStation ? `वार्ड ${w}: ${wardPollingStations[w]}` : `वार्ड ${w} (केंद्र सेट नहीं)`}
                >
                  <span>वार्ड {w}</span>
                  {hasStation && <span style={{ fontSize: '9px', color: '#16a34a' }}>●</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Column C: Polling Station Input for this Ward */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
            <span>
              वार्ड {typedWard ? `"${typedWard}"` : '...'} का मतदान केंद्र पता / नाम:
            </span>
            {editingWardKey && wardPollingStations[editingWardKey] && (
              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                वर्तमान में सुरक्षित है
              </span>
            )}
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={stationAddress}
              onChange={(e) => setStationAddress(e.target.value)}
              placeholder="उदा. 569 - राजकीय उच्च माध्यमिक विद्यालय, जाटा बास, महामंदिर, जोधपुर"
              style={{
                flex: '1 1 280px',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid #60a5fa',
                background: '#ffffff',
                fontSize: '13px',
                color: '#0f172a',
                outline: 'none',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveWardStation();
                }
              }}
            />
            <button
              type="button"
              onClick={() => handleSaveWardStation()}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                flex: '0 0 auto',
              }}
            >
              <Check size={14} />
              <span>वार्ड {typedWard ? typedWard : ''} का केंद्र सेव करें</span>
            </button>
            {editingWardKey && (
              <button
                type="button"
                onClick={() => handleDeleteWard(editingWardKey)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="इस वार्ड का केंद्र हटाएं"
              >
                <Trash2 size={13} />
                <span>हटाएं</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Table / Card List of All Configured Ward Polling Stations */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
            मैप किए गए वार्ड व मतदान केंद्र सूची ({configuredWardList.length}):
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            क्लिक करके एडिट या प्रीव्यू करें
          </span>
        </div>

        {configuredWardList.length === 0 ? (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              background: '#f8fafc',
              border: '1.5px dashed #cbd5e1',
              borderRadius: '10px',
              color: '#64748b',
              fontSize: '12.5px',
            }}
          >
            <Info size={18} color="#94a3b8" style={{ margin: '0 auto 6px' }} />
            <div>अभी तक किसी वार्ड का अलग मतदान केंद्र नहीं जोड़ा गया है।</div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
              ऊपर ड्रॉपडाउन या इनपुट से वार्ड चुनकर उसका केंद्र जोड़ें, अथवा नीचे दिए डिफ़ॉल्ट केंद्र का उपयोग होगा।
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
              gap: '8px',
              maxHeight: '260px',
              overflowY: 'auto',
              padding: '2px',
            }}
          >
            {configuredWardList.map(([wardKey, stationVal]) => {
              const isCurrent = typedWard === wardKey;
              return (
                <div
                  key={`card-${wardKey}`}
                  style={{
                    background: isCurrent ? '#eff6ff' : '#ffffff',
                    border: isCurrent ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span
                        style={{
                          background: '#1e3a8a',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '11px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          flexShrink: 0,
                        }}
                      >
                        वार्ड {wardKey}
                      </span>
                      {selectedPreviewWard === wardKey && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#0284c7' }}>● प्रीव्यू सक्रिय</span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#1e293b',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={stationVal}
                    >
                      {stationVal}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleEditWard(wardKey)}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        color: '#1e293b',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                      title="एडिट व प्रीव्यू करें"
                    >
                      <Edit3 size={11} />
                      <span>एडिट</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWard(wardKey)}
                      style={{
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        padding: '4px 6px',
                        color: '#b91c1c',
                        cursor: 'pointer',
                      }}
                      title="हटाएं"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Default Fallback Polling Station Field */}
      <div
        style={{
          background: '#fffbeb',
          border: '1.5px solid #fde68a',
          borderRadius: '10px',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          <label htmlFor="fallback-polling-station" style={{ fontSize: '12.5px', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building size={14} color="#b45309" />
            <span>डिफ़ॉल्ट मतदान केंद्र (Polling Station Fallback):</span>
          </label>
          <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>
            यदि वोटर का वार्ड ऊपर मैप नहीं है तो यह दिखेगा
          </span>
        </div>
        <input
          id="fallback-polling-station"
          type="text"
          value={config.pollingStationFallback || ''}
          onChange={(e) => onChange({ ...config, pollingStationFallback: e.target.value })}
          placeholder="569 - सामुदायिक भवन, जाटा बास, महामंदिर, जोधपुर"
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1.5px solid #f59e0b',
            background: '#ffffff',
            fontSize: '13px',
            color: '#0f172a',
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
};
