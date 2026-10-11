import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { VoterSlipTemplate, SlipConfig, VoterSlipData } from '../components/VoterSlipTemplate';
import { downloadDataUrl, downloadBlob } from './fileDownload';

export const generateSlipImage = async (
  voter: VoterSlipData,
  slipConfig?: SlipConfig,
  _existingElement?: HTMLElement | null
): Promise<string> => {
  // Robust offscreen rendering strategy:
  // - Uses position:absolute (not fixed) with a large wrapper to prevent viewport clipping
  // - Adds padding buffers around the slip so Devanagari matras and overflow:visible 
  //   content never gets cut off at edges
  // - Uses generous timeouts for Hindi web fonts to fully load and settle
  // - Measures the actual rendered height including any overflow before capture
  return new Promise((resolve, reject) => {
    // Outer wrapper: absolutely positioned off-screen, large enough to never clip
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.top = '-10000px';
    wrapper.style.left = '-10000px';
    wrapper.style.width = '700px';  // wider than 600px to absorb horizontal overflow
    wrapper.style.opacity = '0';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.zIndex = '-99999';
    wrapper.style.overflow = 'visible';
    wrapper.dir = 'ltr';
    document.body.appendChild(wrapper);

    // Inner container: precisely 600px, with vertical padding buffers for matra clipping
    const container = document.createElement('div');
    container.style.width = '600px';
    container.style.minWidth = '600px';
    container.style.maxWidth = '600px';
    container.style.margin = '0 auto';
    container.style.padding = '20px 0';  // vertical buffer for Devanagari matras
    container.style.boxSizing = 'border-box';
    container.style.overflow = 'visible';
    container.style.background = '#ffffff';
    wrapper.appendChild(container);

    const root = createRoot(container);
    const ref = React.createRef<HTMLDivElement>();

    root.render(
      React.createElement(VoterSlipTemplate, {
        voter,
        config: slipConfig,
        forwardedRef: ref,
        isInline: false,
      })
    );

    setTimeout(async () => {
      try {
        if (!ref.current) throw new Error('Template not mounted');

        // Wait for all web fonts (especially Devanagari) to be fully loaded
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

        // Allow layout and web fonts to settle completely (extra time for Hindi fonts)
        await new Promise((res) => setTimeout(res, 350));

        // Capture the container (includes padding buffers), NOT just ref.current
        // This ensures matras/overflow content at top/bottom edges are captured
        const targetNode = container;
        const rect = targetNode.getBoundingClientRect();

        // Measure the full height including any overflow beyond the box model
        const innerRect = ref.current.getBoundingClientRect();
        const innerFullHeight = Math.max(innerRect.height, ref.current.scrollHeight, ref.current.offsetHeight);
        // Container height = inner content + padding buffers (20px top + 20px bottom)
        const captureHeight = Math.ceil(innerFullHeight + 40);
        const captureWidth = 600;

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
          width: captureWidth,
          height: captureHeight,
          windowWidth: 1200,
          windowHeight: captureHeight + 500,
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
              .voter-slip-printable-card {
                overflow: visible !important;
              }
              .voter-slip-inner-card {
                overflow: visible !important;
              }
              .voter-slip-ribbon {
                min-height: 68px !important;
                padding: 12px 14px !important;
                overflow: visible !important;
              }
              .voter-slip-ribbon-content,
              .voter-slip-ribbon-content * {
                overflow: visible !important;
                line-height: 1.35 !important;
              }
              .voter-slip-ribbon-evm-badge,
              .voter-slip-ribbon-evm-badge * {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                line-height: 1 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }
              .voter-slip-ribbon-pill {
                min-height: 28px !important;
                padding: 6px 12px !important;
                overflow: visible !important;
              }
              .voter-slip-ribbon-pill span {
                line-height: 1.25 !important;
                display: inline-flex !important;
                align-items: center !important;
                white-space: nowrap !important;
              }
              .voter-slip-symbol-caption,
              .voter-slip-symbol-caption * {
                min-height: 26px !important;
                height: auto !important;
                padding: 2px 4px !important;
                line-height: 1.25 !important;
                overflow: visible !important;
              }
              .voter-slip-center-column,
              .voter-slip-center-column * {
                overflow: visible !important;
              }
              .voter-slip-candidate-name,
              .voter-slip-candidate-name div {
                overflow: visible !important;
                line-height: 1.4 !important;
              }
              .voter-slip-voter-table,
              .voter-slip-voter-row,
              .voter-slip-voter-label,
              .voter-slip-voter-value {
                overflow: visible !important;
              }
              .voter-slip-footer-appeal,
              .voter-slip-footer-appeal * {
                overflow: visible !important;
              }
              .voter-slip-polling-box,
              .voter-slip-polling-box * {
                overflow: visible !important;
              }
            `;
            clonedDoc.head.appendChild(style);

            // Also force all responsive media query overrides to NOT apply
            // by setting the cloned container to exactly 600px width
            const allSlipCards = clonedDoc.querySelectorAll('.voter-slip-printable-card');
            allSlipCards.forEach((el) => {
              (el as HTMLElement).style.width = '600px';
              (el as HTMLElement).style.maxWidth = '600px';
              (el as HTMLElement).style.padding = '16px';
            });
          },
        });

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

        root.unmount();
        if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
        resolve(dataUrl);
      } catch (err) {
        root.unmount();
        if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
        reject(err);
      }
    }, 450);  // Increased initial timeout for Hindi fonts
  });
};

export const downloadSlip = async (
  voter: VoterSlipData,
  slipConfig?: SlipConfig,
  _existingElement?: HTMLElement | null
): Promise<boolean> => {
  try {
    const dataUrl = await generateSlipImage(voter, slipConfig);
    const fileName = `VoterSlip_${voter.epic || voter.serialNo}_${voter.nameEn || voter.nameHi || 'voter'}.jpg`;
    downloadDataUrl(dataUrl, fileName);
    return true;
  } catch (err) {
    console.error('Failed to download slip:', err);
    alert('पर्ची डाउनलोड नहीं हो सकी। कृपया दोबारा प्रयास करें।');
    return false;
  }
};

export const downloadBulkSlipsAsZip = async (
  votersList: VoterSlipData[],
  slipConfig?: SlipConfig,
  onProgress?: (current: number, total: number) => void
): Promise<boolean> => {
  if (!votersList || votersList.length === 0) return false;

  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const candidateFolder = (slipConfig?.candidateName || 'VoterSlips').replace(/[^a-zA-Z0-9\u0900-\u097F_-]/g, '_');
    const folder = zip.folder(candidateFolder) || zip;

    for (let i = 0; i < votersList.length; i++) {
      const voter = votersList[i];
      if (onProgress) onProgress(i + 1, votersList.length);
      try {
        const dataUrl = await generateSlipImage(voter, slipConfig);
        const base64Data = dataUrl.replace(/^data:image\/(jpeg|png|webp);base64,/, '');
        const serialPadded = String(voter.serialNo || i + 1).padStart(4, '0');
        const safeName = (voter.nameHi || voter.nameEn || 'voter').replace(/[^a-zA-Z0-9\u0900-\u097F_-]/g, '_');
        const epicClean = (voter.epic || '').replace(/[^a-zA-Z0-9_-]/g, '');
        const filename = `${serialPadded}_${epicClean || 'slip'}_${safeName}.jpg`;
        folder.file(filename, base64Data, { base64: true });
      } catch (itemErr) {
        console.warn(`Failed to generate slip for voter ${voter.epic}:`, itemErr);
      }
      // Small pause to yield main thread
      await new Promise((r) => setTimeout(r, 20));
    }

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const zipFileName = `VoterSlips_Bulk_${Date.now()}.zip`;
    await downloadBlob(zipBlob, zipFileName);
    return true;
  } catch (err) {
    console.error('Failed to create bulk zip:', err);
    alert('बल्क ज़िप तैयार करने में समस्या आई। कृपया पुनः प्रयास करें।');
    return false;
  }
};
