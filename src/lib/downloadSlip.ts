import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { VoterSlipTemplate, SlipConfig, VoterSlipData } from '../components/VoterSlipTemplate';
import { downloadDataUrl } from './fileDownload';

export const generateSlipImage = async (voter: VoterSlipData, slipConfig?: SlipConfig): Promise<string> => {
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '-9999px';
    container.style.width = '600px';
    container.style.zIndex = '-9999';
    container.dir = 'ltr';
    document.body.appendChild(container);
    
    const root = createRoot(container);
    const ref = React.createRef<HTMLDivElement>();
    
    root.render(React.createElement(VoterSlipTemplate, { voter, config: slipConfig, forwardedRef: ref }));
    
    setTimeout(async () => {
      try {
        if (!ref.current) throw new Error("Template not mounted");
        
        // Wait for all candidate and symbol images to fully decode
        const imgs = Array.from(ref.current.querySelectorAll('img'));
        await Promise.all(
          imgs.map((img) => {
            if (img.complete && img.naturalHeight !== 0) return Promise.resolve(true);
            return new Promise((resolve) => {
              img.onload = () => resolve(true);
              img.onerror = () => resolve(true);
            });
          })
        );

        // Allow styling and web fonts to settle
        await new Promise((resolve) => setTimeout(resolve, 100));

        const canvas = await html2canvas(ref.current, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        
        root.unmount();
        document.body.removeChild(container);
        resolve(dataUrl);
      } catch (err) {
        root.unmount();
        if(document.body.contains(container)) document.body.removeChild(container);
        reject(err);
      }
    }, 220);
  });
};

export const downloadSlip = async (voter: VoterSlipData, slipConfig?: SlipConfig) => {
  try {
    const dataUrl = await generateSlipImage(voter, slipConfig);
    const fileName = `VoterSlip_${voter.epic || voter.serialNo}_${voter.nameEn || 'voter'}.jpg`;
    downloadDataUrl(dataUrl, fileName);
  } catch(err) {
    console.error('Failed to download slip:', err);
    alert('पर्ची डाउनलोड नहीं हो सकी।');
  }
};
