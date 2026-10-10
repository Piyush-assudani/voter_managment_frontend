import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { VoterSlipTemplate, SlipConfig } from '../components/VoterSlipTemplate';
import { downloadDataUrl } from './fileDownload';

export const generateSlipImage = async (voter: any, slipConfig?: SlipConfig): Promise<string> => {
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.dir = 'ltr';
    document.body.appendChild(container);
    
    const root = createRoot(container);
    const ref = React.createRef<HTMLDivElement>();
    
    root.render(React.createElement(VoterSlipTemplate as any, { voter, config: slipConfig, forwardedRef: ref }));
    
    setTimeout(async () => {
      try {
        if (!ref.current) throw new Error("Template not mounted");
        
        const canvas = await html2canvas(ref.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        
        root.unmount();
        document.body.removeChild(container);
        resolve(dataUrl);
      } catch (err) {
        root.unmount();
        if(document.body.contains(container)) document.body.removeChild(container);
        reject(err);
      }
    }, 200);
  });
};

export const downloadSlip = async (voter: any, slipConfig?: SlipConfig) => {
  try {
    const dataUrl = await generateSlipImage(voter, slipConfig);
    const fileName = `VoterSlip_${voter.epic || voter.serialNo}_${voter.nameEn || 'voter'}.jpg`;
    downloadDataUrl(dataUrl, fileName);
  } catch(err) {
    console.error('Failed to download slip:', err);
    alert('पर्ची डाउनलोड नहीं हो सकी।');
  }
};
