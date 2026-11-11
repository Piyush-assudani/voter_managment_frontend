/**
 * Timezone-safe Date/Time utilities for VijaySetu Frontend.
 * All backend dates travel as UTC ISO strings; UI renders deterministically in Asia/Kolkata or client IANA timezone.
 */

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export function getClientTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function parseSafeDate(input: string | number | Date | null | undefined): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatIstDateTime(
  input: string | number | Date | null | undefined,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  const d = parseSafeDate(input);
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return d.toLocaleString('en-IN');
  }
}

export function formatIstTimeOnly(
  input: string | number | Date | null | undefined,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  const d = parseSafeDate(input);
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return d.toLocaleTimeString('en-IN');
  }
}

