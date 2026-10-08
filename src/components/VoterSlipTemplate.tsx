import React from 'react';

interface Voter {
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
}

interface VoterSlipTemplateProps {
  voter: Voter;
  forwardedRef: React.RefObject<HTMLDivElement>;
}

export const VoterSlipTemplate: React.FC<VoterSlipTemplateProps> = ({ voter, forwardedRef }) => {
  const ward = (voter.wardNo || '').replace('वार्ड ', '');
  const part = (voter.partNo || '').replace('भाग ', '');
  
  return (
    <div 
      ref={forwardedRef}
      style={{
        width: '600px',
        padding: '2px',
        background: '#fff',
        fontFamily: '"Inter", "Noto Sans", sans-serif',
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
        color: '#333'
      }}
    >
      <div style={{
        border: '3px solid #1e3a8a',
        borderRadius: '12px',
        background: '#fff',
        overflow: 'hidden'
      }}>
        <div style={{ height: '6px', background: '#f97316', margin: '4px 16px 2px 16px', borderRadius: '3px' }}></div>
        <div style={{ height: '6px', background: '#16a34a', margin: '2px 16px 0px 16px', borderRadius: '3px' }}></div>

        <div style={{ padding: '24px 32px 16px 32px', textAlign: 'center' }}>
          <div style={{ color: '#2563eb', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>प्रत्याशी</div>
          <div style={{ color: '#1e3a8a', fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>ग्राम पंचायत जेलातरा</div>
          <div style={{ color: '#4b5563', fontSize: '15px', fontWeight: '600' }}>मतदाता सूचना पर्ची (Voter Slip) · ग्राम पंचायत जेलातरा जालोर</div>
          
          <div style={{ height: '2px', background: '#e5e7eb', margin: '20px 0' }}></div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
            <div style={{ flex: 1, border: '2px solid #8b5cf6', background: '#f5f3ff', borderRadius: '8px', padding: '12px 0' }}>
              <div style={{ color: '#6d28d9', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>वार्ड संख्या (WARD)</div>
              <div style={{ color: '#5b21b6', fontSize: '36px', fontWeight: '800', lineHeight: '1' }}>{ward || '—'}</div>
            </div>
            <div style={{ flex: 1, border: '2px solid #1d4ed8', background: '#eff6ff', borderRadius: '8px', padding: '12px 0' }}>
              <div style={{ color: '#1e40af', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>भाग संख्या (PART)</div>
              <div style={{ color: '#1e3a8a', fontSize: '36px', fontWeight: '800', lineHeight: '1' }}>{part || '—'}</div>
            </div>
            <div style={{ flex: 1, border: '2px solid #ea580c', background: '#fff7ed', borderRadius: '8px', padding: '12px 0' }}>
              <div style={{ color: '#c2410c', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>क्रम संख्या (SERIAL)</div>
              <div style={{ color: '#9a3412', fontSize: '36px', fontWeight: '800', lineHeight: '1' }}>{voter.serialNo || '—'}</div>
            </div>
          </div>

          <div style={{ textAlign: 'left', fontSize: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ width: '180px', color: '#6b7280', fontWeight: '600' }}>मतदाता का नाम:</div>
              <div style={{ fontWeight: '700', color: '#111827' }}>{(voter.nameEn || '') + ' / ' + (voter.nameHi || '')}</div>
            </div>
            <div style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ width: '180px', color: '#6b7280', fontWeight: '600' }}>{voter.relationType === 'husband' ? 'पति:' : 'पिता:'}</div>
              <div style={{ fontWeight: '700', color: '#111827' }}>{(voter.relativeNameEn || '') + ' / ' + (voter.relativeNameHi || '')}</div>
            </div>
            <div style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ width: '180px', color: '#6b7280', fontWeight: '600' }}>मकान संख्या:</div>
              <div style={{ fontWeight: '700', color: '#111827' }}>{voter.houseNo || '—'}</div>
            </div>
            <div style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ width: '180px', color: '#6b7280', fontWeight: '600' }}>आयु / लिंग:</div>
              <div style={{ fontWeight: '700', color: '#111827' }}>{voter.age || '—'} वर्ष | {voter.gender || '—'}</div>
            </div>
            <div style={{ display: 'flex', padding: '12px 0' }}>
              <div style={{ width: '180px', color: '#6b7280', fontWeight: '600' }}>पहचान पत्र (EPIC):</div>
              <div style={{ fontWeight: '800', color: '#1d4ed8' }}>{voter.epic || '—'}</div>
            </div>
          </div>

          <div style={{ border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px', textAlign: 'left', marginBottom: '24px' }}>
            <div style={{ color: '#2563eb', fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ color: '#ef4444' }}>📍</span> मतदान केंद्र (Polling Station):
            </div>
            <div style={{ fontWeight: '800', fontSize: '16px', color: '#111827', marginBottom: '4px' }}>
              {part} - राजकीय उच्च माध्यमिक विधालय (कमरा नंबर 1)
            </div>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>
              क्षेत्र: वार्ड 1 व 9 (विश्नोईयों की ढाणी, भीलों का वास, मेघवालों का वास)
            </div>
          </div>

          <div style={{ height: '2px', background: '#e5e7eb', marginBottom: '16px' }}></div>

          <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e40af', marginBottom: '8px' }}>
            🗳️ मतदान हमारा अधिकार एवं कर्तव्य है 🗳️
          </div>
          <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: '600' }}>
            🙏 कृपया मतदान दिवस पर अपना पहचान पत्र (Voter ID / आधार कार्ड) साथ लाएं।
          </div>
        </div>
      </div>
    </div>
  );
};
