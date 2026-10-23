import { VoterSlipData, SlipConfig } from '@/components/VoterSlipTemplate';
import { generateSlipImage, generateFamilySlipImage } from './downloadSlip';
import { downloadDataUrl } from './fileDownload';
import { apiFetch } from './api';

export interface WhatsAppShareOptions {
  voter: VoterSlipData;
  slipConfig?: SlipConfig;
  phoneNumber?: string;
  preGeneratedImageDataUrl?: string;
  existingElement?: HTMLElement | null;
  onStatusUpdate?: (status: string) => void;
}

export interface WhatsAppFamilyShareOptions {
  familyMembers: VoterSlipData[];
  slipConfig?: SlipConfig;
  metadata?: { houseNo?: string; wardNo?: string; partNo?: string; boothName?: string };
  phoneNumber?: string;
  preGeneratedImageDataUrl?: string;
  onStatusUpdate?: (status: string) => void;
}

export interface WhatsAppShareResult {
  success: boolean;
  method: 'android_native' | 'web_share' | 'desktop_clipboard';
  message: string;
  remainingCredits?: number;
  waLink?: string;
  imageDataUrl?: string;
  viewUrl?: string;
  voterName?: string;
  epic?: string;
}

/**
 * Standardize recipient phone number for WhatsApp links
 * Handles 10-digit Indian numbers by prefixing 91
 */
export function cleanWaPhone(phone: string): string {
  let digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = '91' + digits;
  return digits;
}

/**
 * Convert data URL to PNG Blob (Required for navigator.clipboard.write on Chromium/Safari)
 */
export async function convertToPngBlob(dataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas 2D context not available'));
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create PNG blob'));
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('Failed to decode image data'));
    img.src = dataUrl;
  });
}

/**
 * Copy image data URL directly to clipboard as PNG
 */
export async function copySlipImageToClipboard(dataUrl: string): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
    return false;
  }
  try {
    const pngBlob = await convertToPngBlob(dataUrl);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
    return true;
  } catch (err) {
    console.warn('Clipboard write error:', err);
    return false;
  }
}

/**
 * Universal WhatsApp Slip Sharing Helper (Individual):
 * 1. Android App: Uses native AndroidWhatsAppBridge with FileProvider URI (photo + caption)
 * 2. Mobile Browser: Uses Web Share API (attaches actual image file + caption to WhatsApp)
 * 3. Desktop Browser: Auto-downloads image + copies to clipboard + opens WhatsApp Web with instruction
 */
export async function shareVoterSlipToWhatsApp(
  options: WhatsAppShareOptions
): Promise<WhatsAppShareResult> {
  const { voter, slipConfig, phoneNumber, preGeneratedImageDataUrl, existingElement, onStatusUpdate } = options;

  onStatusUpdate?.('पर्ची की फोटो और विवरण तैयार किया जा रहा है...');

  // 1. Obtain image data URL (from pre-rendered cache if ready, otherwise generate)
  let slipImageDataUrl = preGeneratedImageDataUrl;
  if (!slipImageDataUrl) {
    try {
      slipImageDataUrl = await generateSlipImage(voter, slipConfig, existingElement);
    } catch (imgErr) {
      console.warn('Failed to render slip image for WhatsApp:', imgErr);
    }
  }

  // 2. Register dispatch in backend to deduct credit & store image for public link
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let backendData: any = {};
  try {
    const response = await apiFetch('/whatsapp/send-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voterId: voter._id,
        phoneNumber: phoneNumber || voter.phone || '',
        slipImageDataUrl,
        slipType: 'individual',
      }),
    });
    backendData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(backendData.message || 'WhatsApp पर्ची तैयार नहीं की जा सकी');
    }
  } catch (apiErr) {
    console.warn('Backend send-manual error:', apiErr);
  }

  const messageText = backendData.messageText || `🗳️ आधिकारिक मतदाता सूचना पर्ची: ${voter.nameHi || voter.nameEn}`;
  const targetPhone = phoneNumber || voter.phone || '';

  // 3. ANDROID NATIVE APP: If running inside VijaySetu Android APK
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof window !== 'undefined' && (window as any).AndroidWhatsAppBridge?.shareSlipToWhatsApp) {
    try {
      if (slipImageDataUrl) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).AndroidWhatsAppBridge.shareSlipToWhatsApp(
          slipImageDataUrl,
          targetPhone,
          messageText
        );
        onStatusUpdate?.('✅ WhatsApp खुल गया! फोटो व विवरण साथ में भेजा जा रहा है।');
        return {
          success: true,
          method: 'android_native',
          message: 'WhatsApp ऐप में फोटो व पर्ची खुल गई है!',
          remainingCredits: backendData.remainingCredits,
        };
      }
    } catch (androidErr) {
      console.warn('Android bridge error, falling back:', androidErr);
    }
  }

  // 4. MOBILE BROWSER WEB SHARE API (Direct attachment of image file to WhatsApp)
  let sharedViaNative = false;
  if (slipImageDataUrl && typeof window !== 'undefined' && navigator.canShare) {
    try {
      const res = await fetch(slipImageDataUrl);
      const blob = await res.blob();
      const slipFile = new File([blob], `VoterSlip_${voter.epic || voter.serialNo || 'slip'}.jpg`, {
        type: 'image/jpeg',
      });

      if (navigator.canShare({ files: [slipFile] })) {
        await navigator.share({
          title: `मतदाता पर्ची - ${voter.nameHi || voter.nameEn || 'मतदाता'}`,
          text: messageText,
          files: [slipFile],
        });
        sharedViaNative = true;
        onStatusUpdate?.('✅ WhatsApp शेयर खुल गया! फोटो व विवरण साथ में भेजा जा रहा है।');
        return {
          success: true,
          method: 'web_share',
          message: 'WhatsApp शेयर सफलतापूर्वक खुल गया!',
          remainingCredits: backendData.remainingCredits,
        };
      }
    } catch (shareErr) {
      if ((shareErr as Error).name === 'AbortError') {
        return {
          success: false,
          method: 'web_share',
          message: 'शेयर रद्द किया गया।',
          remainingCredits: backendData.remainingCredits,
        };
      }
      console.warn('Native Web Share failed, falling back to desktop/clipboard:', shareErr);
    }
  }

  // 5. DESKTOP BROWSER FALLBACK: Auto-download photo + copy to clipboard + open WhatsApp Web
  if (!sharedViaNative) {
    // A. Auto-download the slip image so the user has the file immediately
    if (slipImageDataUrl) {
      try {
        downloadDataUrl(slipImageDataUrl, `VoterSlip_${voter.epic || voter.serialNo || 'slip'}.jpg`);
      } catch (dlErr) {
        console.warn('Auto download error:', dlErr);
      }
    }

    // B. Copy image to clipboard as PNG for instant Ctrl + V in WhatsApp Web
    if (slipImageDataUrl) {
      await copySlipImageToClipboard(slipImageDataUrl);
    }

    // C. Open WhatsApp Web chat
    const normalizedTarget = cleanWaPhone(targetPhone);
    const waLink = backendData.waLink || (normalizedTarget
      ? `https://wa.me/${normalizedTarget}?text=${encodeURIComponent(messageText)}`
      : `https://wa.me/?text=${encodeURIComponent(messageText)}`);
    if (typeof window !== 'undefined') {
      window.open(waLink, '_blank');
    }

    onStatusUpdate?.('📋 फोटो क्लिपबोर्ड में कॉपी हो गई (Download भी हो गई)! WhatsApp Web में Cmd + V (Ctrl + V) दबाकर फोटो भेजें।');
    return {
      success: true,
      method: 'desktop_clipboard',
      message: 'फोटो डाउनलोड और क्लिपबोर्ड में कॉपी हो गई है! WhatsApp Web खुलते ही Cmd + V (Ctrl + V) दबाकर फोटो तुरंत भेजें।',
      remainingCredits: backendData.remainingCredits,
      waLink,
      imageDataUrl: slipImageDataUrl,
      viewUrl: backendData.viewUrl || backendData.slipImageUrl,
      voterName: voter.nameHi || voter.nameEn || 'मतदाता',
      epic: voter.epic,
    };
  }

  return {
    success: true,
    method: 'desktop_clipboard',
    message: 'संदेश तैयार है।',
    imageDataUrl: slipImageDataUrl,
    viewUrl: backendData.viewUrl || backendData.slipImageUrl,
    voterName: voter.nameHi || voter.nameEn || 'मतदाता',
    epic: voter.epic,
  };
}

/**
 * Universal WhatsApp Slip Sharing Helper (Family Wise):
 * Sends the combined Family Voter Slip with all household members
 */
export async function shareFamilySlipToWhatsApp(
  options: WhatsAppFamilyShareOptions
): Promise<WhatsAppShareResult> {
  const { familyMembers, slipConfig, metadata, phoneNumber, preGeneratedImageDataUrl, onStatusUpdate } = options;

  onStatusUpdate?.('संयुक्त परिवार पर्ची की फोटो तैयार की जा रही है...');

  const first = familyMembers[0] || {};
  const house = metadata?.houseNo || first.houseNo || '—';
  const ward = (metadata?.wardNo || first.wardNo || '').replace(/^(वार्ड|Ward)\s*/i, '') || '—';
  const part = metadata?.partNo || first.partNo || '—';
  const booth = metadata?.boothName || first.boothName || slipConfig?.pollingStationFallback || `भाग संख्या ${part}`;

  // 1. Obtain image data URL (from cache or generate)
  let familyImageDataUrl = preGeneratedImageDataUrl;
  if (!familyImageDataUrl) {
    try {
      familyImageDataUrl = await generateFamilySlipImage(familyMembers, slipConfig, metadata);
    } catch (imgErr) {
      console.warn('Failed to render family slip image for WhatsApp:', imgErr);
    }
  }

  // 2. Register dispatch in backend to deduct credit & store image for public link
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let backendData: any = {};
  const targetPhone = phoneNumber || first.phone || '';
  try {
    const response = await apiFetch('/whatsapp/send-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voterId: first._id,
        phoneNumber: targetPhone,
        slipImageDataUrl: familyImageDataUrl,
        slipType: 'family',
        houseNo: house,
        wardNo: ward,
        partNo: part,
        familyCount: familyMembers.length,
      }),
    });
    backendData = await response.json().catch(() => ({}));
  } catch (apiErr) {
    console.warn('Backend send-manual family error:', apiErr);
  }

  // Structured multi-member message text
  const memberListText = familyMembers
    .map((m, idx) => `${idx + 1}. *${m.nameHi || m.nameEn}* (क्र. ${m.serialNo || '—'}) • EPIC: ${m.epic || '—'}`)
    .join('\n');

  const photoUrl = backendData.slipImageUrl || backendData.viewUrl;
  const messageText = backendData.messageText || `🗳️ *आधिकारिक संयुक्त परिवार मतदाता सूचना पर्ची* 🗳️

नमस्कार,
आगामी चुनाव हेतु आपके परिवार की डिजिटल मतदाता पर्ची का विवरण:

${photoUrl ? `📸 *डिजिटल परिवार पर्ची फोटो यहाँ देखें:*\n${photoUrl}\n\n` : ''}• *मकान संख्या:* #${house}
• *वार्ड क्रमांक:* ${ward} · *भाग संख्या:* ${part}
• *मतदान केंद्र:* ${booth}
• *परिवार में कुल मतदाता:* ${familyMembers.length}

*परिवार के मतदाता सदस्य:*
${memberListText}

🇮🇳 _मतदान हमारा अधिकार एवं कर्तव्य है। मतदान हेतु पहचान पत्र अवश्य साथ लाएं।_
*— ${slipConfig?.candidateName || 'विजयसेतु चुनाव वॉर रूम'}*`;

  // 3. ANDROID NATIVE APP: If running inside VijaySetu Android APK
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof window !== 'undefined' && (window as any).AndroidWhatsAppBridge?.shareSlipToWhatsApp) {
    try {
      if (familyImageDataUrl) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).AndroidWhatsAppBridge.shareSlipToWhatsApp(
          familyImageDataUrl,
          targetPhone,
          messageText
        );
        onStatusUpdate?.('✅ WhatsApp खुल गया! परिवार पर्ची व विवरण भेजा जा रहा है।');
        return {
          success: true,
          method: 'android_native',
          message: 'WhatsApp ऐप में परिवार पर्ची खुल गई है!',
          remainingCredits: backendData.remainingCredits,
        };
      }
    } catch (androidErr) {
      console.warn('Android bridge family share error:', androidErr);
    }
  }

  // 4. MOBILE BROWSER WEB SHARE API
  let sharedViaNative = false;
  if (familyImageDataUrl && typeof window !== 'undefined' && navigator.canShare) {
    try {
      const res = await fetch(familyImageDataUrl);
      const blob = await res.blob();
      const slipFile = new File([blob], `FamilySlip_House_${house}_${familyMembers.length}Voters.jpg`, {
        type: 'image/jpeg',
      });

      if (navigator.canShare({ files: [slipFile] })) {
        await navigator.share({
          title: `संयुक्त परिवार पर्ची - मकान #${house}`,
          text: messageText,
          files: [slipFile],
        });
        sharedViaNative = true;
        onStatusUpdate?.('✅ WhatsApp शेयर खुल गया! परिवार पर्ची फोटो व विवरण भेजा जा रहा है।');
        return {
          success: true,
          method: 'web_share',
          message: 'WhatsApp शेयर सफलतापूर्वक खुल गया!',
          remainingCredits: backendData.remainingCredits,
        };
      }
    } catch (shareErr) {
      if ((shareErr as Error).name === 'AbortError') {
        return {
          success: false,
          method: 'web_share',
          message: 'शेयर रद्द किया गया।',
          remainingCredits: backendData.remainingCredits,
        };
      }
      console.warn('Native Web Share family failed, falling back:', shareErr);
    }
  }

  // 5. DESKTOP BROWSER FALLBACK
  if (!sharedViaNative) {
    if (familyImageDataUrl) {
      try {
        downloadDataUrl(familyImageDataUrl, `FamilySlip_House_${house}_${familyMembers.length}Voters.jpg`);
      } catch (dlErr) {
        console.warn('Auto download error:', dlErr);
      }
      await copySlipImageToClipboard(familyImageDataUrl);
    }

    const normalizedFamilyTarget = cleanWaPhone(targetPhone);
    const waLink = backendData.waLink || (normalizedFamilyTarget
      ? `https://wa.me/${normalizedFamilyTarget}?text=${encodeURIComponent(messageText)}`
      : `https://wa.me/?text=${encodeURIComponent(messageText)}`);
    if (typeof window !== 'undefined') {
      window.open(waLink, '_blank');
    }

    onStatusUpdate?.('📋 परिवार पर्ची क्लिपबोर्ड में कॉपी हो गई (Download भी हुई)! WhatsApp Web में Cmd + V (Ctrl + V) दबाकर फोटो भेजें।');
    return {
      success: true,
      method: 'desktop_clipboard',
      message: 'परिवार पर्ची डाउनलोड और क्लिपबोर्ड में कॉपी हो गई है! WhatsApp Web में Cmd + V दबाकर फोटो भेजें।',
      remainingCredits: backendData.remainingCredits,
      waLink,
      imageDataUrl: familyImageDataUrl,
      viewUrl: backendData.viewUrl || backendData.slipImageUrl,
      voterName: `मकान #${house} परिवार (${familyMembers.length} सदस्य)`,
      epic: `House #${house}`,
    };
  }

  return {
    success: true,
    method: 'desktop_clipboard',
    message: 'संदेश तैयार है।',
    imageDataUrl: familyImageDataUrl,
    viewUrl: backendData.viewUrl || backendData.slipImageUrl,
    voterName: `मकान #${house} परिवार`,
  };
}
