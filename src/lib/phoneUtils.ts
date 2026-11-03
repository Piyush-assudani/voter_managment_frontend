/**
 * Universal Phone & WhatsApp helper for Indian mobile numbers
 * Auto-handles:
 * - 10-digit Indian numbers: 9876543210 -> 919876543210
 * - 11-digit numbers with leading 0: 09876543210 -> 919876543210
 * - Numbers with +91: +91 98765-43210 -> 919876543210
 * - Prevents opening invalid/broken wa.me links that cause WhatsApp error screens
 */

export function cleanIndianPhoneNumber(rawPhone: string | null | undefined): string {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return '';

  // If starts with 0 and has 11 digits (e.g. 09876543210)
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.substring(1);
  }

  // Standard 10-digit Indian mobile number
  if (digits.length === 10) {
    return '91' + digits;
  }

  // Already 12 digits starting with 91
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }

  // Fallback for valid lengths
  return digits;
}

export function isValidPhoneNumber(rawPhone: string | null | undefined): boolean {
  if (!rawPhone) return false;
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.length < 10) return false;
  // Ignore dummy repeated zeroes or obvious invalid sequences
  if (/^0+$/.test(digits) || digits === '1234567890') return false;
  return true;
}

export function getCleanWhatsAppUrl(rawPhone: string | null | undefined, text?: string): string {
  const cleaned = cleanIndianPhoneNumber(rawPhone);
  if (!cleaned || cleaned.length < 10) return '';
  const textParam = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${cleaned}${textParam}`;
}
