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
        width: '650px',
        padding: '30px',
        background: '#f8fafc',
        fontFamily: '"Inter", "Noto Sans", sans-serif',
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
        color: '#0f172a'
      }}
    >
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.02)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Subtle top accent */}
        <div style={{ display: 'flex', height: '6px' }}>
          <div style={{ flex: 1, background: '#f97316' }}></div>
          <div style={{ flex: 1, background: '#ffffff' }}></div>
          <div style={{ flex: 1, background: '#16a34a' }}></div>
        </div>

        <div style={{ padding: '40px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>आधिकारिक मतदाता पर्ची</div>
              <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>ग्राम पंचायत जेलातरा</div>
              <div style={{ color: '#475569', fontSize: '14px', fontWeight: '500', marginTop: '4px' }}>पंचायत समिति चुनाव - 2026</div>
            </div>
            {/* Minimalist QR placeholder representing digital nature */}
            <div style={{ width: '64px', height: '64px', background: '#f1f5f9', borderRadius: '8px', padding: '4px', display: 'flex', flexWrap: 'wrap', gap: '2px', alignContent: 'flex-start' }}>
               <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', fill: '#cbd5e1' }}>
                 <path d="M10 10h30v30H10zM60 10h30v30H60zM10 60h30v30H10z" fill="none" stroke="#94a3b8" strokeWidth="8"/>
                 <rect x="20" y="20" width="10" height="10"/>
                 <rect x="70" y="20" width="10" height="10"/>
                 <rect x="20" y="70" width="10" height="10"/>
                 <rect x="50" y="50" width="15" height="15"/>
                 <rect x="70" y="70" width="20" height="20"/>
                 <rect x="50" y="75" width="10" height="10"/>
               </svg>
            </div>
          </div>
          
          <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(226,232,240,1) 0%, rgba(226,232,240,0) 100%)', marginBottom: '32px' }}></div>

          {/* Core Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '36px' }}>
            <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', borderLeft: '3px solid #3b82f6' }}>
              <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>वार्ड (WARD)</div>
              <div style={{ color: '#0f172a', fontSize: '24px', fontWeight: '800' }}>{ward || '—'}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', borderLeft: '3px solid #8b5cf6' }}>
              <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>भाग (PART)</div>
              <div style={{ color: '#0f172a', fontSize: '24px', fontWeight: '800' }}>{part || '—'}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', borderLeft: '3px solid #f97316' }}>
              <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>क्रम (SERIAL)</div>
              <div style={{ color: '#0f172a', fontSize: '24px', fontWeight: '800' }}>{voter.serialNo || '—'}</div>
            </div>
          </div>

          {/* Details Table */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '36px' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: '160px', padding: '16px 20px', background: '#f8fafc', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>EPIC (पहचान पत्र)</div>
              <div style={{ flex: 1, padding: '16px 20px', color: '#0f172a', fontSize: '16px', fontWeight: '700', letterSpacing: '0.5px' }}>{voter.epic || '—'}</div>
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: '160px', padding: '16px 20px', background: '#f8fafc', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>नाम</div>
              <div style={{ flex: 1, padding: '16px 20px', color: '#0f172a', fontSize: '15px', fontWeight: '600' }}>
                {(voter.nameEn || '')} <span style={{ color: '#94a3b8', margin: '0 6px' }}>|</span> {(voter.nameHi || '')}
              </div>
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: '160px', padding: '16px 20px', background: '#f8fafc', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>{voter.relationType === 'husband' || voter.relationType === 'पति' ? 'पति' : 'पिता'} का नाम</div>
              <div style={{ flex: 1, padding: '16px 20px', color: '#334155', fontSize: '15px', fontWeight: '500' }}>
                {(voter.relativeNameEn || '')} <span style={{ color: '#94a3b8', margin: '0 6px' }}>|</span> {(voter.relativeNameHi || '')}
              </div>
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: '160px', padding: '16px 20px', background: '#f8fafc', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>मकान संख्या</div>
              <div style={{ flex: 1, padding: '16px 20px', color: '#334155', fontSize: '15px', fontWeight: '500' }}>{voter.houseNo || '—'}</div>
            </div>
            <div style={{ display: 'flex' }}>
              <div style={{ width: '160px', padding: '16px 20px', background: '#f8fafc', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>आयु एवं लिंग</div>
              <div style={{ flex: 1, padding: '16px 20px', color: '#334155', fontSize: '15px', fontWeight: '500' }}>{voter.age || '—'} वर्ष, {voter.gender || '—'}</div>
            </div>
          </div>

          {/* Polling Station */}
          <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '20px', background: '#bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📍</div>
            <div>
              <div style={{ color: '#166534', fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>मतदान केंद्र (Polling Station)</div>
              <div style={{ color: '#14532d', fontSize: '15px', fontWeight: '600' }}>{part} - राजकीय उच्च माध्यमिक विधालय (कमरा नंबर 1)</div>
            </div>
          </div>
          
        </div>
        
        {/* Footer */}
        <div style={{ background: '#0f172a', padding: '24px 40px', textAlign: 'center' }}>
           <div style={{ color: '#f8fafc', fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>🗳️ मतदान हमारा अधिकार एवं कर्तव्य है</div>
           <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '400' }}>कृपया मतदान दिवस पर अपना पहचान पत्र (Voter ID) अवश्य साथ लाएं।</div>
        </div>

      </div>
    </div>
  );
};
