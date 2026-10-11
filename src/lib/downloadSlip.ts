import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { VoterSlipTemplate, SlipConfig, VoterSlipData } from '../components/VoterSlipTemplate';
import { downloadDataUrl } from './fileDownload';

export const generateSlipImage = async (
  voter: VoterSlipData,
  slipConfig?: SlipConfig,
  existingElement?: HTMLElement | null
): Promise<string> => {
  // If element is already rendered in the DOM and is wide enough (>= 500px), snapshot directly
  if (existingElement && existingElement.offsetWidth >= 500) {
    try {
      const target = (existingElement.querySelector('.voter-slip-printable-card') as HTMLElement) || existingElement;
      if (document.fonts) {
        try {
          await document.fonts.ready;
        } catch {
          // ignore font ready errors
        }
      }
      const imgs = Array.from(target.querySelectorAll('img'));
      await Promise.all(
        imgs.map((img) => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve(true);
          return new Promise((resolve) => {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(true);
            setTimeout(() => resolve(true), 1500);
          });
        })
      );
      const canvas = await html2canvas(target, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Anek+Devanagari:wght@400;500;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&display=swap');
            * {
              -webkit-font-smoothing: antialiased !important;
              -moz-osx-font-smoothing: grayscale !important;
              text-rendering: optimizeLegibility !important;
            }
            .voter-slip-printable-card,
            .voter-slip-printable-card * {
              font-family: 'Anek Devanagari', 'Noto Sans Devanagari', sans-serif !important;
              letter-spacing: normal !important;
              word-spacing: normal !important;
              font-variant-ligatures: normal !important;
              font-feature-settings: "kern" 1, "liga" 1, "calt" 1 !important;
            }
            .voter-slip-ribbon-content,
            .voter-slip-ribbon-content * {
              overflow: visible !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        },
      });
      return canvas.toDataURL('image/jpeg', 0.95);
    } catch (existingErr) {
      console.warn('Direct snapshot failed, falling back to offscreen renderer:', existingErr);
    }
  }

  // Offscreen rendering fallback (always renders pristine 580px standard slip)
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '580px';
    container.style.maxWidth = '580px';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-99999';
    container.style.overflow = 'hidden';
    container.dir = 'ltr';
    document.body.appendChild(container);

    const root = createRoot(container);
    const ref = React.createRef<HTMLDivElement>();

    root.render(React.createElement(VoterSlipTemplate, { voter, config: slipConfig, forwardedRef: ref }));

    setTimeout(async () => {
      try {
        if (!ref.current) throw new Error("Template not mounted");

        if (document.fonts) {
          try {
            await document.fonts.ready;
          } catch {
            // ignore font load errors
          }
        }

        // Wait for all candidate and symbol images to fully decode
        const imgs = Array.from(ref.current.querySelectorAll('img'));
        await Promise.all(
          imgs.map(async (img) => {
            try {
              if (img.complete && img.naturalHeight !== 0) return true;
              if (img.decode) {
                await img.decode();
                return true;
              }
            } catch {
              // ignore
            }
            return new Promise((res) => {
              img.onload = () => res(true);
              img.onerror = () => res(true);
              setTimeout(() => res(true), 1500);
            });
          })
        );

        // Allow styling and web fonts to settle
        await new Promise((res) => setTimeout(res, 150));

        const targetNode = ref.current;
        const canvas = await html2canvas(targetNode, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          width: targetNode.offsetWidth || 580,
          height: targetNode.offsetHeight || 800,
          windowWidth: 1200,
          onclone: (clonedDoc) => {
            const style = clonedDoc.createElement('style');
            style.innerHTML = `
              @import url('https://fonts.googleapis.com/css2?family=Anek+Devanagari:wght@400;500;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&display=swap');
              * {
                -webkit-font-smoothing: antialiased !important;
                -moz-osx-font-smoothing: grayscale !important;
                text-rendering: optimizeLegibility !important;
              }
              .voter-slip-printable-card,
              .voter-slip-printable-card * {
                font-family: 'Anek Devanagari', 'Noto Sans Devanagari', sans-serif !important;
                letter-spacing: normal !important;
                word-spacing: normal !important;
                font-variant-ligatures: normal !important;
                font-feature-settings: "kern" 1, "liga" 1, "calt" 1 !important;
              }
              .voter-slip-ribbon-content,
              .voter-slip-ribbon-content * {
                overflow: visible !important;
              }
            `;
            clonedDoc.head.appendChild(style);
          },
        });

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

        root.unmount();
        if (document.body.contains(container)) document.body.removeChild(container);
        resolve(dataUrl);
      } catch (err) {
        root.unmount();
        if (document.body.contains(container)) document.body.removeChild(container);
        reject(err);
      }
    }, 280);
  });
};

export const downloadSlip = async (
  voter: VoterSlipData,
  slipConfig?: SlipConfig,
  existingElement?: HTMLElement | null
): Promise<boolean> => {
  try {
    const dataUrl = await generateSlipImage(voter, slipConfig, existingElement);
    const fileName = `VoterSlip_${voter.epic || voter.serialNo}_${voter.nameEn || voter.nameHi || 'voter'}.jpg`;
    downloadDataUrl(dataUrl, fileName);
    return true;
  } catch (err) {
    console.error('Failed to download slip:', err);
    alert('पर्ची डाउनलोड नहीं हो सकी। कृपया दोबारा प्रयास करें।');
    return false;
  }
};
