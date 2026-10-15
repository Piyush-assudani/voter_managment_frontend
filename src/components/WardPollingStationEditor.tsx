'use client';

import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Check,
  Trash2,
  Edit3,
  Eye,
  Building,
  Sparkles,
  Info,
  CheckCircle2,
  X,
  Layers,
  Plus,
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

  // Multi-Ward Selection State: Array of selected ward numbers (e.g. ['1', '2', '3'])
  const [selectedWards, setSelectedWards] = useState<string[]>([]);
  const [typedWardInput, setTypedWardInput] = useState<string>('');
  const [stationAddress, setStationAddress] = useState<string>('');
  const [statusNotice, setStatusNotice] = useState<string>('');

  // Extract unique existing station addresses to easily re-use
  const existingStationAddresses = useMemo(() => {
    const set = new Set<string>();
    Object.values(wardPollingStations).forEach((addr) => {
      if (typeof addr === 'string' && addr.trim()) {
        set.add(addr.trim());
      }
    });
    return Array.from(set).sort();
  }, [wardPollingStations]);

  // Group mapped wards by station address so shared booths are immediately clear
  const groupedStations = useMemo(() => {
    const map = new Map<string, string[]>();
    Object.entries(wardPollingStations).forEach(([ward, addr]) => {
      if (typeof addr === 'string' && addr.trim()) {
        const cleanAddr = addr.trim();
        const currentList = map.get(cleanAddr) || [];
        currentList.push(ward);
        map.set(cleanAddr, currentList);
      }
    });

    // Sort wards within each group
    const result: Array<{ address: string; wards: string[] }> = [];
    map.forEach((wards, address) => {
      wards.sort((a, b) => {
        const na = parseInt(a, 10);
        const nb = parseInt(b, 10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      });
      result.push({ address, wards });
    });

    return result.sort((a, b) => {
      const na = parseInt(a.wards[0] || '0', 10);
      const nb = parseInt(b.wards[0] || '0', 10);
      return na - nb;
    });
  }, [wardPollingStations]);

  // Toggle ward in multi-select
  const toggleWard = (ward: string) => {
    const clean = String(ward).trim().replace(/^(वार्ड|Ward)\s*/i, '').trim();
    if (!clean) return;

    setSelectedWards((prev) => {
      const exists = prev.includes(clean);
      const next = exists ? prev.filter((w) => w !== clean) : [...prev, clean];
      next.sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));

      // Auto-populate address if only 1 ward selected and it has an existing booth
      if (!exists && next.length === 1 && wardPollingStations[clean]) {
        setStationAddress(wardPollingStations[clean]);
      }
      return next;
    });

    onPreviewWardChange?.(clean);
  };

  // Parse comma-separated or range numbers from text input
  const handleParseTypedWards = (input: string) => {
    setTypedWardInput(input);
    if (!input.trim()) return;

    const parts = input.split(/[,;\s]+/).map((s) => s.trim().replace(/^(वार्ड|Ward)\s*/i, '').trim()).filter(Boolean);
    const parsedSet = new Set<string>(selectedWards);

    parts.forEach((p) => {
      // Check range e.g. "1-5"
      const rangeMatch = p.match(/^(\d+)-(\d+)$/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        if (!isNaN(start) && !isNaN(end) && start <= end && end - start <= 50) {
          for (let i = start; i <= end; i++) {
            parsedSet.add(String(i));
          }
        }
      } else if (/^\d+$/.test(p) || p.length > 0) {
        parsedSet.add(p);
      }
    });

    const next = Array.from(parsedSet).sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));
    setSelectedWards(next);
  };

  // Helper actions
  const selectAllWards = () => {
    setSelectedWards([...allKnownWards]);
  };

  const selectUnmappedWards = () => {
    const unmapped = allKnownWards.filter((w) => !wardPollingStations[w]);
    setSelectedWards(unmapped);
    if (unmapped.length === 0) {
      setStatusNotice('सभी वार्ड पहले से मैप किए जा चुके हैं!');
      setTimeout(() => setStatusNotice(''), 3000);
    }
  };

  const clearSelectedWards = () => {
    setSelectedWards([]);
    setTypedWardInput('');
  };

  // Save polling station to ALL selected wards in 1 click
  const handleSaveToSelectedWards = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (selectedWards.length === 0) {
      setStatusNotice('कृपया पहले कम से कम एक या अधिक वार्ड चुनें!');
      setTimeout(() => setStatusNotice(''), 3000);
      return;
    }

    if (!stationAddress.trim()) {
      setStatusNotice('कृपया मतदान केंद्र का नाम / पता दर्ज करें!');
      setTimeout(() => setStatusNotice(''), 3000);
      return;
    }

    const updated = { ...wardPollingStations };
    selectedWards.forEach((w) => {
      updated[w] = stationAddress.trim();
    });

    onChange({
      ...config,
      wardPollingStations: updated,
    });

    if (selectedWards[0]) {
      onPreviewWardChange?.(selectedWards[0]);
    }

    const count = selectedWards.length;
    setStatusNotice(
      count > 1
        ? `✅ कुल ${count} वार्डों (${selectedWards.map((w) => `वार्ड ${w}`).join(', ')}) पर एक ही मतदान केंद्र सफलतापूर्वक सेट हो गया!`
        : `✅ वार्ड ${selectedWards[0]} का मतदान केंद्र सुरक्षित हुआ!`
    );

    setTimeout(() => setStatusNotice(''), 4000);
  };

  // Edit an existing grouped booth
  const handleEditGroup = (group: { address: string; wards: string[] }) => {
    setSelectedWards([...group.wards]);
    setStationAddress(group.address);
    if (group.wards[0]) {
      onPreviewWardChange?.(group.wards[0]);
    }
    // Scroll to editor box
    const el = document.getElementById('ward-booth-input-dock');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Delete all wards in a group
  const handleDeleteGroup = (group: { address: string; wards: string[] }) => {
    const updated = { ...wardPollingStations };
    group.wards.forEach((w) => {
      delete updated[w];
    });

    onChange({
      ...config,
      wardPollingStations: updated,
    });

    // Remove from selection if any were selected
    setSelectedWards((prev) => prev.filter((w) => !group.wards.includes(w)));
    setStatusNotice(`वार्ड ${group.wards.join(', ')} का मतदान केंद्र हटा दिया गया।`);
    setTimeout(() => setStatusNotice(''), 3000);
  };

  // Delete a single ward from mapping
  const handleDeleteSingleWard = (wardToDelete: string) => {
    const updated = { ...wardPollingStations };
    delete updated[wardToDelete];

    onChange({
      ...config,
      wardPollingStations: updated,
    });

    setSelectedWards((prev) => prev.filter((w) => w !== wardToDelete));
    setStatusNotice(`वार्ड ${wardToDelete} का मतदान केंद्र हटाया गया।`);
    setTimeout(() => setStatusNotice(''), 3000);
  };

  return (
    <div
      className="ward-polling-editor-container"
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1.5px solid #e2e8f0',
        padding: isCompact ? '16px' : '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        boxShadow: '0 4px 20px -3px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* 1. Header Section */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MapPin size={18} />
            </span>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              वार्ड अनुसार मतदान केंद्र (Ward-wise Polling Stations)
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#0284c7',
                background: '#e0f2fe',
                padding: '2px 9px',
                borderRadius: '14px',
              }}
            >
              {Object.keys(wardPollingStations).length} वार्ड मैप हैं
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.45 }}>
            एक ही क्लाइंट (<strong>{organizationName}</strong>) के अलग-अलग वार्डों के लिए मतदान केंद्र सेट करें। <strong>2 या 2 से अधिक वार्डों का एक ही मतदान केंद्र (Same Booth) हो तो उन्हें एक साथ चुनकर 1-क्लिक में सेट कर सकते हैं।</strong>
          </p>
        </div>

        {/* Live Preview Ward Switcher */}
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
            <span style={{ fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>पर्ची प्रीव्यू वार्ड:</span>
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
            fontSize: '13px',
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

      {/* 2. Interactive Multi-Ward Selection Dock */}
      <div
        id="ward-booth-input-dock"
        style={{
          background: '#f8fafc',
          border: '1.5px solid #93c5fd',
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 2px 10px rgba(59, 130, 246, 0.05)',
        }}
      >
        {/* Step A Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={15} color="#ea580c" />
            <span>स्टेप 1: वार्ड चुनें (एक साथ कई वार्ड चुन सकते हैं जिनका केंद्र एक ही हो):</span>
          </div>

          {/* Quick Select Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={selectAllWards}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#2563eb',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                padding: '3px 8px',
                cursor: 'pointer',
              }}
            >
              सभी चुनें
            </button>
            <button
              type="button"
              onClick={selectUnmappedWards}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#d97706',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '6px',
                padding: '3px 8px',
                cursor: 'pointer',
              }}
            >
              केवल बिना केंद्र वाले
            </button>
            {selectedWards.length > 0 && (
              <button
                type="button"
                onClick={clearSelectedWards}
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#dc2626',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  cursor: 'pointer',
                }}
              >
                चयन हटाएं
              </button>
            )}
          </div>
        </div>

        {/* Multi-Select Ward Chips */}
        {allKnownWards.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', maxHeight: '140px', overflowY: 'auto', padding: '2px' }}>
            {allKnownWards.map((w) => {
              const isChecked = selectedWards.includes(w);
              const mappedStation = wardPollingStations[w];
              return (
                <button
                  key={`multi-chip-${w}`}
                  type="button"
                  onClick={() => toggleWard(w)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: isChecked
                      ? '2px solid #2563eb'
                      : mappedStation
                      ? '1px solid #86efac'
                      : '1px solid #cbd5e1',
                    background: isChecked ? '#2563eb' : mappedStation ? '#f0fdf4' : '#ffffff',
                    color: isChecked ? '#ffffff' : mappedStation ? '#15803d' : '#334155',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.12s ease',
                    boxShadow: isChecked ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
                  }}
                  title={mappedStation ? `वार्ड ${w}: ${mappedStation}` : `वार्ड ${w} (केंद्र सेट नहीं)`}
                >
                  <span style={{ fontSize: '11px' }}>{isChecked ? '✓' : mappedStation ? '●' : '○'}</span>
                  <span>वार्ड {w}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: '#64748b' }}>डेटाबेस में कोई वार्ड नहीं मिला। नीचे खुद वार्ड नंबर लिखें।</div>
        )}

        {/* Text Input for Custom or Multiple Wards */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 240px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
            <span style={{ whiteSpace: 'nowrap' }}>✏️ अथवा वार्ड नंबर लिखें:</span>
            <input
              type="text"
              value={typedWardInput}
              onChange={(e) => handleParseTypedWards(e.target.value)}
              placeholder="उदा. 1, 2, 3 या 1-5 (एंटर दबाएं)"
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleParseTypedWards(typedWardInput);
                }
              }}
            />
          </label>

          {/* Selected Wards Counter Pill */}
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              background: selectedWards.length > 0 ? '#dbeafe' : '#f1f5f9',
              border: `1px solid ${selectedWards.length > 0 ? '#93c5fd' : '#e2e8f0'}`,
              fontSize: '12px',
              fontWeight: 800,
              color: selectedWards.length > 0 ? '#1d4ed8' : '#64748b',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>🎯 चुने गए वार्ड:</span>
            {selectedWards.length > 0 ? (
              <span>
                {selectedWards.map((w) => `वार्ड ${w}`).join(', ')} ({selectedWards.length})
              </span>
            ) : (
              <span style={{ fontWeight: 500 }}>(कोई वार्ड नहीं चुना)</span>
            )}
          </div>
        </div>

        {/* Step B: Polling Station Input & Quick Re-use Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={15} color="#2563eb" />
              <span>स्टेप 2: इन चुने गए वार्डों का मतदान केंद्र (Polling Station Name / Address):</span>
            </label>

            {/* Quick Preset: Choose from existing booths if available */}
            {existingStationAddresses.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>मौजूदा केंद्र से चुनें:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) setStationAddress(e.target.value);
                  }}
                  defaultValue=""
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    background: '#ffffff',
                    maxWidth: '240px',
                    outline: 'none',
                  }}
                >
                  <option value="">-- पूर्व में दर्ज केंद्र चुनें --</option>
                  {existingStationAddresses.map((addr) => (
                    <option key={`opt-addr-${addr}`} value={addr}>
                      {addr}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={stationAddress}
              onChange={(e) => setStationAddress(e.target.value)}
              placeholder="उदा. 569 - राजकीय उच्च माध्यमिक विद्यालय, जाटा बास, महामंदिर, जोधपुर"
              style={{
                flex: '1 1 320px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1.5px solid #2563eb',
                background: '#ffffff',
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveToSelectedWards();
                }
              }}
            />
            <button
              type="button"
              onClick={() => handleSaveToSelectedWards()}
              disabled={selectedWards.length === 0 || !stationAddress.trim()}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: selectedWards.length === 0 || !stationAddress.trim() ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                cursor: selectedWards.length === 0 || !stationAddress.trim() ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                flex: '0 0 auto',
              }}
            >
              <Check size={16} />
              <span>
                {selectedWards.length > 1
                  ? `इन ${selectedWards.length} वार्डों पर यह केंद्र लागू करें (Apply to ${selectedWards.length} Wards)`
                  : selectedWards.length === 1
                  ? `वार्ड ${selectedWards[0]} पर केंद्र सेट करें`
                  : 'मतदान केंद्र सेव करें'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Grouped View: Showing Shared Polling Stations Across Wards */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} color="#2563eb" />
            <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#1e293b' }}>
              मैप किए गए मतदान केंद्र व संबंधित वार्ड ({groupedStations.length} केंद्र • {Object.keys(wardPollingStations).length} वार्ड):
            </span>
          </div>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
            समान केंद्र वाले वार्ड एक साथ समूहीकृत (Grouped) हैं
          </span>
        </div>

        {groupedStations.length === 0 ? (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              background: '#f8fafc',
              border: '1.5px dashed #cbd5e1',
              borderRadius: '12px',
              color: '#64748b',
              fontSize: '13px',
            }}
          >
            <Info size={20} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 700 }}>अभी तक किसी वार्ड का अलग मतदान केंद्र नहीं जोड़ा गया है।</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              ऊपर स्टेप 1 से 1 या 2+ वार्ड चुनकर उनका मतदान केंद्र असाइन करें, अथवा नीचे दिए गए डिफ़ॉल्ट केंद्र का उपयोग होगा।
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '340px',
              overflowY: 'auto',
              padding: '2px',
            }}
          >
            {groupedStations.map((group, gIdx) => {
              const isSelectedGroup = group.wards.some((w) => selectedWards.includes(w));
              return (
                <div
                  key={`group-${gIdx}-${group.address}`}
                  style={{
                    background: isSelectedGroup ? '#eff6ff' : '#ffffff',
                    border: isSelectedGroup ? '1.5px solid #3b82f6' : '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    {/* Polling Station Address Headline */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                        📍 {group.address}
                      </span>
                      {group.wards.length > 1 && (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            background: '#dbeafe',
                            color: '#1d4ed8',
                            padding: '1px 7px',
                            borderRadius: '10px',
                          }}
                        >
                          {group.wards.length} वार्डों का साझा बूथ
                        </span>
                      )}
                    </div>

                    {/* Ward Badges inside this booth */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>लागू वार्ड:</span>
                      {group.wards.map((w) => (
                        <span
                          key={`grp-w-${w}`}
                          style={{
                            background: '#1e3a8a',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '11.5px',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          वार्ड {w}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSingleWard(w);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#93c5fd',
                              cursor: 'pointer',
                              padding: '0',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                            title={`वार्ड ${w} को इस बूथ से हटाएं`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions on this shared booth */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleEditGroup(group)}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '5px 10px',
                        color: '#1e293b',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="इन वार्डों को ऊपर एडिट बॉक्स में लोड करें या अन्य वार्ड जोड़ें"
                    >
                      <Edit3 size={12} />
                      <span>एडिट / वार्ड जोड़ें</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(group)}
                      style={{
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        padding: '5px 8px',
                        color: '#b91c1c',
                        cursor: 'pointer',
                      }}
                      title="इन सभी वार्डों का केंद्र हटाएं"
                    >
                      <Trash2 size={13} />
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
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          <label htmlFor="fallback-polling-station" style={{ fontSize: '13px', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building size={15} color="#b45309" />
            <span>डिफ़ॉल्ट मतदान केंद्र (Polling Station Fallback):</span>
          </label>
          <span style={{ fontSize: '11.5px', color: '#b45309', fontWeight: 600 }}>
            यदि वोटर का वार्ड ऊपर मैप नहीं है तो पर्ची में यह डिफ़ॉल्ट केंद्र छपेगा
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
            padding: '9px 12px',
            borderRadius: '8px',
            border: '1.5px solid #f59e0b',
            background: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            color: '#0f172a',
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
};

