import { VoterSlipData, SlipConfig } from '@/components/VoterSlipTemplate';
import { generateSlipImage } from './downloadSlip';
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

export interface WhatsAppShareResult {
  success: boolean;
  method: 'android_native' | 'web_share' | 'desktop_clipboard';
  message: string;
  remainingCredits?: number;
  waLink?: string;
}

/**
 * Universal WhatsApp Slip Sharing Helper:
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

    // B. Copy image to clipboard for instant Ctrl + V in WhatsApp Web
    if (slipImageDataUrl && typeof window !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      try {
        const res = await fetch(slipImageDataUrl);
        const blob = await res.blob();
        try {
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        } catch {
          // If JPEG rejected by clipboard, convert to PNG
          const img = new Image();
          img.src = slipImageDataUrl;
          await img.decode();
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          canvas.toBlob(async (pngBlob) => {
            if (pngBlob) {
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
            }
          }, 'image/png');
        }
      } catch (clipErr) {
        console.warn('Clipboard write error:', clipErr);
      }
    }

    // C. Open WhatsApp Web chat
    const waLink = backendData.waLink || `https://wa.me/${targetPhone.replace(/\D/g, '')}?text=${encodeURIComponent(messageText)}`;
    if (typeof window !== 'undefined') {
      window.open(waLink, '_blank');
    }

    onStatusUpdate?.('📋 फोटो क्लिपबोर्ड में कॉपी हो गई (Download भी हो गई)! WhatsApp Web में Ctrl + V दबाकर फोटो भेजें।');
    return {
      success: true,
      method: 'desktop_clipboard',
      message: 'फोटो डाउनलोड और क्लिपबोर्ड में कॉपी हो गई है! WhatsApp Web खुलते ही Ctrl + V दबाकर फोटो तुरंत भेजें।',
      remainingCredits: backendData.remainingCredits,
      waLink,
    };
  }

  return {
    success: true,
    method: 'desktop_clipboard',
    message: 'संदेश तैयार है।',
  };
}
