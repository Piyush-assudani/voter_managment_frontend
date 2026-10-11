declare global {
  interface Window {
    AndroidBlobDownloader?: {
      processBase64Blob: (data: string, filename: string) => void;
    };
  }
}

/**
 * Universal file downloader supporting both standard browsers and
 * native Android WebView via AndroidBlobDownloader JavaScript interface.
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  if (typeof window !== 'undefined' && window.AndroidBlobDownloader?.processBase64Blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          window.AndroidBlobDownloader?.processBase64Blob(reader.result as string, filename);
        } catch (e) {
          console.error('AndroidBlobDownloader failed:', e);
        }
        resolve();
      };
      reader.readAsDataURL(blob);
    });
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  if (typeof window !== 'undefined' && window.AndroidBlobDownloader?.processBase64Blob) {
    try {
      window.AndroidBlobDownloader.processBase64Blob(dataUrl, filename);
      return;
    } catch (e) {
      console.error('AndroidBlobDownloader dataUrl failed:', e);
    }
  }

  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binaryStr = atob(parts[1]);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (err) {
    console.warn('Fallback to direct dataUrl anchor download:', err);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
