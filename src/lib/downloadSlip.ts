import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { VoterSlipTemplate, SlipConfig, VoterSlipData } from '../components/VoterSlipTemplate';
import { FamilyVoterSlipTemplate } from '../components/FamilyVoterSlipTemplate';
import { downloadDataUrl, downloadBlob } from './fileDownload';
import { toast } from '../components/Toast';

export const generateSlipImage = async (
  voter: VoterSlipData,
  slipConfig?: SlipConfig,
  _existingElement?: HTMLElement | null
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Fixed positioning at 0, 0 prepended to body guarantees (0, 0) coordinates in layout engine
    // and zero scroll/viewport/offset clipping issues
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '600px';
    container.style.minWidth = '600px';
    container.style.maxWidth = '600px';
    container.style.opacity = '0';
    container.style.visibility = 'visible';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-99999';
    container.style.background = '#ffffff';
    container.style.overflow = 'visible';
    container.dir = 'ltr';
    document.body.prepend(container);

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
        await new Promise((res) => setTimeout(res, 250));

        const targetNode = ref.current;
        const resolvedFont =
          window.getComputedStyle(targetNode).fontFamily ||
          '"Noto Sans Devanagari", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        const nodeWidth = Math.max(600, targetNode.offsetWidth || 600);
        const nodeHeight = Math.max(650, targetNode.scrollHeight || targetNode.offsetHeight || 800);

        const canvas = await html2canvas(targetNode, {
          scale: 3.0,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          width: nodeWidth,
          height: nodeHeight,
          windowWidth: nodeWidth,
          windowHeight: nodeHeight + 200,
          onclone: (clonedDoc) => {
            const style = clonedDoc.createElement('style');
            style.textContent = `
              * {
                -webkit-font-smoothing: subpixel-antialiased !important;
                -moz-osx-font-smoothing: auto !important;
                text-rendering: geometricPrecision !important;
                image-rendering: -webkit-optimize-contrast !important;
              }
              .voter-slip-printable-card,
              .voter-slip-printable-card * {
                font-family: ${resolvedFont} !important;
                letter-spacing: normal !important;
                word-spacing: normal !important;
                font-variant-ligatures: normal !important;
                font-feature-settings: "kern" 1, "liga" 1, "calt" 1 !important;
              }
              .voter-slip-printable-card {
                overflow: visible !important;
                height: auto !important;
                max-height: none !important;
                width: ${nodeWidth}px !important;
                max-width: ${nodeWidth}px !important;
                padding: 16px !important;
                position: static !important;
              }
              .voter-slip-inner-card {
                overflow: visible !important;
                height: auto !important;
                max-height: none !important;
              }
              .voter-slip-serial-badge {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 0 4px !important;
              }
              .voter-slip-serial-badge span {
                display: inline-block !important;
                line-height: 1 !important;
                position: relative !important;
                top: -2.5px !important;
              }
              .voter-slip-ribbon {
                background: #1e3a8a !important;
                background-image: linear-gradient(to right, #ea580c, #1e3a8a) !important;
                min-height: 68px !important;
                padding: 12px 14px !important;
                overflow: visible !important;
              }
              .voter-slip-ribbon-content {
                position: relative !important;
                top: -2px !important;
                overflow: visible !important;
              }
              .voter-slip-ribbon-content * {
                overflow: visible !important;
                line-height: 1.35 !important;
              }
              .voter-slip-ribbon-evm-badge {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                line-height: 1 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }
              .voter-slip-ribbon-evm-badge span {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                display: block !important;
                line-height: 1 !important;
                margin: 0 !important;
                padding: 0 !important;
                position: relative !important;
                top: -3.5px !important;
              }
              .voter-slip-ribbon-pill {
                min-height: 28px !important;
                height: auto !important;
                padding: 4px 10px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
              }
              .voter-slip-ribbon-pill span {
                line-height: 1.15 !important;
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
                position: relative !important;
                top: -2.5px !important;
                white-space: nowrap !important;
              }
              .voter-slip-symbol-caption {
                min-height: 34px !important;
                height: auto !important;
                padding: 4px 6px !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                box-sizing: border-box !important;
              }
              .voter-slip-symbol-caption * {
                line-height: 1.2 !important;
                margin: 0 !important;
                padding: 0 !important;
                text-align: center !important;
                position: relative !important;
                top: -2.5px !important;
              }
              .voter-slip-center-column,
              .voter-slip-center-column * {
                overflow: visible !important;
              }
              .voter-slip-center-column > div {
                position: relative !important;
                top: -2px !important;
              }
              .voter-slip-candidate-name,
              .voter-slip-candidate-name div {
                overflow: visible !important;
                line-height: 1.4 !important;
              }
              .voter-slip-metric-label {
                position: relative !important;
                top: -2px !important;
              }
              .voter-slip-metric-num {
                position: relative !important;
                top: -3px !important;
                line-height: 1.05 !important;
              }
              .voter-slip-voter-table,
              .voter-slip-voter-row,
              .voter-slip-voter-label,
              .voter-slip-voter-value {
                overflow: visible !important;
              }
              .voter-slip-voter-label,
              .voter-slip-voter-value {
                position: relative !important;
                top: -3px !important;
              }
              .voter-slip-footer-appeal,
              .voter-slip-footer-appeal * {
                overflow: visible !important;
              }
              .voter-slip-footer-appeal > div {
                position: relative !important;
                top: -2px !important;
              }
              .voter-slip-polling-box,
              .voter-slip-polling-box * {
                overflow: visible !important;
              }
              .voter-slip-polling-box > div {
                position: relative !important;
                top: -2px !important;
              }
            `;
            clonedDoc.head.appendChild(style);

            // Isolate card directly into clonedDoc.body at (0, 0)
            // This guarantees zero vertical scroll, layout offset, or iframe height clipping
            const card = clonedDoc.querySelector('.voter-slip-printable-card') as HTMLElement;
            if (card) {
              clonedDoc.body.innerHTML = '';
              clonedDoc.body.style.margin = '0';
              clonedDoc.body.style.padding = '0';
              clonedDoc.body.style.background = '#ffffff';
              clonedDoc.body.style.overflow = 'visible';
              clonedDoc.body.appendChild(card);
              card.style.position = 'static';
              card.style.margin = '0 auto';
              card.style.left = '0';
              card.style.top = '0';
              card.style.width = `${nodeWidth}px`;
              card.style.maxWidth = `${nodeWidth}px`;
              card.style.height = 'auto';
              card.style.overflow = 'visible';
              card.style.padding = '16px';
              card.style.opacity = '1';
              card.style.visibility = 'visible';
            }
          },
        });

        const dataUrl = canvas.toDataURL('image/png');

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
  _existingElement?: HTMLElement | null
): Promise<boolean> => {
  try {
    const dataUrl = await generateSlipImage(voter, slipConfig);
    const fileName = `VoterSlip_${voter.epic || voter.serialNo}_${voter.nameEn || voter.nameHi || 'voter'}.jpg`;
    downloadDataUrl(dataUrl, fileName);
    return true;
  } catch (err) {
    console.error('Failed to download slip:', err);
    toast.error('पर्ची डाउनलोड नहीं हो सकी। कृपया दोबारा प्रयास करें।');
    return false;
  }
};

export const generateFamilySlipImage = async (
  familyMembers: VoterSlipData[],
  slipConfig?: SlipConfig,
  metadata?: { houseNo?: string; wardNo?: string; partNo?: string; boothName?: string }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '660px';
    container.style.minWidth = '660px';
    container.style.maxWidth = '660px';
    container.style.opacity = '0';
    container.style.visibility = 'visible';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-99999';
    container.style.background = '#ffffff';
    container.style.overflow = 'visible';
    container.dir = 'ltr';
    document.body.prepend(container);

    const root = createRoot(container);
    const ref = React.createRef<HTMLDivElement>();

    root.render(
      React.createElement(FamilyVoterSlipTemplate, {
        familyMembers,
        houseNo: metadata?.houseNo,
        wardNo: metadata?.wardNo,
        partNo: metadata?.partNo,
        boothName: metadata?.boothName,
        config: slipConfig,
        forwardedRef: ref,
        isInline: false,
      })
    );

    setTimeout(async () => {
      try {
        if (!ref.current) throw new Error('Template not mounted');

        if (document.fonts) {
          try {
            await document.fonts.ready;
          } catch {}
        }

        const imgs = Array.from(ref.current.querySelectorAll('img'));
        await Promise.all(
          imgs.map(async (img) => {
            try {
              if (img.complete && img.naturalHeight !== 0) return true;
              if (img.decode) {
                await img.decode();
                return true;
              }
            } catch {}
            return new Promise((res) => {
              img.onload = () => res(true);
              img.onerror = () => res(true);
              setTimeout(() => res(true), 1200);
            });
          })
        );

        await new Promise((res) => setTimeout(res, 250));

        const targetNode = ref.current;
        const resolvedFamilyFont =
          window.getComputedStyle(targetNode).fontFamily ||
          '"Noto Sans Devanagari", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        const nodeWidth = Math.max(660, targetNode.offsetWidth || 660);
        const nodeHeight = Math.max(650, targetNode.scrollHeight || targetNode.offsetHeight || 800);

        const canvas = await html2canvas(targetNode, {
          scale: 3.0,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          width: nodeWidth,
          height: nodeHeight,
          windowWidth: nodeWidth,
          windowHeight: nodeHeight + 200,
          onclone: (clonedDoc) => {
            const style = clonedDoc.createElement('style');
            style.textContent = `
              * {
                -webkit-font-smoothing: subpixel-antialiased !important;
                -moz-osx-font-smoothing: auto !important;
                text-rendering: geometricPrecision !important;
                image-rendering: -webkit-optimize-contrast !important;
                font-family: ${resolvedFamilyFont} !important;
              }
              .family-slip-printable-card {
                width: ${nodeWidth}px !important;
                max-width: ${nodeWidth}px !important;
                padding: 16px !important;
                overflow: visible !important;
                position: static !important;
                height: auto !important;
              }
            `;
            clonedDoc.head.appendChild(style);

            // Isolate family card directly into clonedDoc.body at (0, 0)
            const card = clonedDoc.querySelector('.family-slip-printable-card') as HTMLElement;
            if (card) {
              clonedDoc.body.innerHTML = '';
              clonedDoc.body.style.margin = '0';
              clonedDoc.body.style.padding = '0';
              clonedDoc.body.style.background = '#ffffff';
              clonedDoc.body.style.overflow = 'visible';
              clonedDoc.body.appendChild(card);
              card.style.position = 'static';
              card.style.margin = '0 auto';
              card.style.left = '0';
              card.style.top = '0';
              card.style.width = `${nodeWidth}px`;
              card.style.maxWidth = `${nodeWidth}px`;
              card.style.height = 'auto';
              card.style.overflow = 'visible';
              card.style.padding = '16px';
              card.style.opacity = '1';
              card.style.visibility = 'visible';
            }
          },
        });

        const dataUrl = canvas.toDataURL('image/png');
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

export const downloadFamilySlip = async (
  familyMembers: VoterSlipData[],
  slipConfig?: SlipConfig,
  metadata?: { houseNo?: string; wardNo?: string; partNo?: string; boothName?: string }
): Promise<boolean> => {
  try {
    const dataUrl = await generateFamilySlipImage(familyMembers, slipConfig, metadata);
    const house = metadata?.houseNo || familyMembers[0]?.houseNo || 'family';
    const ward = metadata?.wardNo || familyMembers[0]?.wardNo || '';
    const fileName = `FamilySlip_House_${house}_Ward_${ward}_${familyMembers.length}Voters.jpg`;
    downloadDataUrl(dataUrl, fileName);
    return true;
  } catch (err) {
    console.error('Failed to download family slip:', err);
    toast.error('परिवार पर्ची डाउनलोड नहीं हो सकी। कृपया दोबारा प्रयास करें।');
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
    toast.error('बल्क ज़िप तैयार करने में समस्या आई। कृपया पुनः प्रयास करें।');
    return false;
  }
};
