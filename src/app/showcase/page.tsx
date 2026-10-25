'use client';

import React, { useState } from 'react';
import { WardPollingStationEditor } from '@/components/WardPollingStationEditor';
import { VoterSlipTemplate, SlipConfig, defaultSlipConfig, VoterSlipData } from '@/components/VoterSlipTemplate';
import {
  Sparkles,
  CheckCircle2,
  Building,
  MapPin,
  Vote,
  Layers,
  ArrowRight,
  Play,
  RotateCcw,
} from 'lucide-react';

export default function ShowcasePage() {
  const [config, setConfig] = useState<SlipConfig>({
    ...defaultSlipConfig,
    candidateName: 'विजय कुमार राठौड़',
    candidateNameEn: 'Vijay Kumar Rathore',
    partyName: 'लोकप्रिय जन प्रतिनिधि प्रत्याशी',
    partySymbolName: 'कमल का फूल',
    wardPollingStations: {
      '1': 'राजकीय उच्च प्राथमिक विद्यालय, कमरा नं. 1',
      '2': 'राजकीय उच्च प्राथमिक विद्यालय, कमरा नं. 1',
    },
  });

  const availableWards = Array.from({ length: 15 }, (_, i) => String(i + 1));
  const [selectedPreviewWard, setSelectedPreviewWard] = useState<string>('1');

  // Sample voter for live preview
  const sampleVoter: VoterSlipData = {
    epic: 'VJY8923412',
    nameHi: 'रमेश कुमार शर्मा',
    nameEn: 'Ramesh Kumar Sharma',
    relativeNameHi: 'रामस्वरूप शर्मा',
    relativeNameEn: 'Ramswaroop Sharma',
    relationType: 'पिता',
    age: 42,
    gender: 'M',
    houseNo: 'B-104',
    wardNo: selectedPreviewWard,
    serialNo: 148,
    boothName: config.wardPollingStations?.[selectedPreviewWard] || config.pollingStationFallback || 'सामुदायिक भवन',
  };

  const mappedCount = Object.keys(config.wardPollingStations || {}).length;

  const handleApplyPreset1 = () => {
    setConfig((prev) => ({
      ...prev,
      wardPollingStations: {
        ...(prev.wardPollingStations || {}),
        '3': 'सामुदायिक भवन, मुख्य चौक',
        '4': 'सामुदायिक भवन, मुख्य चौक',
        '5': 'सामुदायिक भवन, मुख्य चौक',
      },
    }));
    setSelectedPreviewWard('3');
  };

  const handleApplyPreset2 = () => {
    setConfig((prev) => ({
      ...prev,
      wardPollingStations: {
        ...(prev.wardPollingStations || {}),
        '6': 'महात्मा गांधी राजकीय अंग्रेजी विद्यालय, हॉल 2',
        '7': 'महात्मा गांधी राजकीय अंग्रेजी विद्यालय, हॉल 2',
        '8': 'महात्मा गांधी राजकीय अंग्रेजी विद्यालय, हॉल 2',
        '9': 'महात्मा गांधी राजकीय अंग्रेजी विद्यालय, हॉल 2',
      },
    }));
    setSelectedPreviewWard('6');
  };

  const handleReset = () => {
    setConfig((prev) => ({
      ...prev,
      wardPollingStations: {},
    }));
    setSelectedPreviewWard('1');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'sans-serif' }}>
      {/* Top Banner */}
      <header
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '16px 28px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.4)',
            }}
          >
            <Vote size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 900, margin: 0, letterSpacing: '-0.3px' }}>
                VijaySetu <span style={{ color: '#fb923c' }}>विजयसेतु</span>
              </h1>
              <span
                style={{
                  background: 'rgba(234, 88, 12, 0.2)',
                  border: '1px solid #ea580c',
                  color: '#fb923c',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                PRO FEATURE SPOTLIGHT
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              वार्ड अनुसार मतदान केंद्र (Ward-wise Polling Stations) Bulk Assignment Engine
            </p>
          </div>
        </div>

        {/* Quick Demo Controller Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            id="demo-action-preset1"
            type="button"
            onClick={handleApplyPreset1}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <Sparkles size={14} color="#fb923c" />
            <span>वार्ड 3-5 ऑटो-मैप</span>
          </button>

          <button
            id="demo-action-preset2"
            type="button"
            onClick={handleApplyPreset2}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={14} color="#38bdf8" />
            <span>वार्ड 6-9 ऑटो-मैप</span>
          </button>

          <button
            id="demo-action-reset"
            type="button"
            onClick={handleReset}
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <RotateCcw size={13} />
            <span>रीसेट</span>
          </button>

          <div
            style={{
              background: '#047857',
              color: '#a7f3d0',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={14} />
            <span>{mappedCount} / {availableWards.length} वार्ड मैप</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '24px 20px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(360px, 0.85fr)',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Editor Component */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: '#ffffff',
              padding: '16px 20px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                ⚡ 1-क्लिक बल्क पोलिंग स्टेशन असाइनमेंट
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                एक साथ 10+ वार्ड्स चुनें या रेंज डालें (जैसे 1-5), एक ही बूथ का पता दें, और सभी वार्ड्स की पर्चियों पर तुरंत प्रिंट हो जाएगा!
              </p>
            </div>
            <div
              style={{
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              100% सिंक्रनाइज़्ड
            </div>
          </div>

          <WardPollingStationEditor
            config={config}
            onChange={setConfig}
            availableWards={availableWards}
            selectedPreviewWard={selectedPreviewWard}
            onPreviewWardChange={setSelectedPreviewWard}
            organizationName="जोधपुर नगर निगम उत्तर"
            isCompact={false}
          />
        </div>

        {/* Right Column: Live Voter Slip Preview */}
        <div
          style={{
            position: 'sticky',
            top: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Slip Header Box */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1.5px solid #cbd5e1',
              padding: '16px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    background: '#fef3c7',
                    color: '#d97706',
                    padding: '4px',
                    borderRadius: '6px',
                    display: 'flex',
                  }}
                >
                  <Building size={16} />
                </span>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    लाइव पर्ची प्रीव्यू (Real-Time Voter Slip)
                  </h3>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    वार्ड {selectedPreviewWard} के मतदाता की पर्ची
                  </span>
                </div>
              </div>

              <div
                style={{
                  background: config.wardPollingStations?.[selectedPreviewWard] ? '#dcfce7' : '#fee2e2',
                  color: config.wardPollingStations?.[selectedPreviewWard] ? '#15803d' : '#b91c1c',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 800,
                }}
              >
                {config.wardPollingStations?.[selectedPreviewWard] ? '✓ केंद्र मैप है' : '⚠️ डिफ़ॉल्ट केंद्र'}
              </div>
            </div>

            {/* Render VoterSlipTemplate */}
            <div
              id="voter-slip-preview-container"
              style={{
                transform: 'scale(0.92)',
                transformOrigin: 'top center',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <VoterSlipTemplate
                voter={sampleVoter}
                config={config}
                format="full"
              />
            </div>

            {/* Booth Info Highlight Card */}
            <div
              style={{
                marginTop: '12px',
                background: '#f8fafc',
                border: '1.5px dashed #94a3b8',
                borderRadius: '10px',
                padding: '12px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                वार्ड {selectedPreviewWard} का वर्तमान सक्रिय मतदान केंद्र:
              </div>
              <div
                id="active-booth-display"
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: config.wardPollingStations?.[selectedPreviewWard] ? '#047857' : '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <MapPin size={15} />
                <span>
                  {config.wardPollingStations?.[selectedPreviewWard] ||
                    `${config.pollingStationFallback || 'कोई केंद्र नहीं'} (Fallback)`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
