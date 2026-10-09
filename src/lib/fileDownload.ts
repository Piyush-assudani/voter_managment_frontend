/**
 * Universal file downloader supporting both standard browsers and
 * native Android WebView via AndroidBlobDownloader JavaScript interface.
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).AndroidBlobDownloader?.processBase64Blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          (window as any).AndroidBlobDownloader.processBase64Blob(reader.result as string, filename);
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
  if (typeof window !== 'undefined' && (window as any).AndroidBlobDownloader?.processBase64Blob) {
    try {
      (window as any).AndroidBlobDownloader.processBase64Blob(dataUrl, filename);
      return;
    } catch (e) {
      console.error('AndroidBlobDownloader dataUrl failed:', e);
    }
  }

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
