import { getClientTimeZone } from '@/lib/dateUtils';
import { enqueueOfflineMutation } from '@/lib/offlineSync';

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

export const API_BASE_URL = (() => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    // When developing on localhost, route through local Next.js proxy to bypass CORS
    return '/api';
  }
  // When running on Vercel or any deployed domain, if NEXT_PUBLIC_API_URL is relative (/api) or unset,
  // directly point to the live backend URL (https://vijaysetu.piyushassudani.in/api) which has CORS enabled.
  if (!configuredApiUrl || configuredApiUrl === '/api') {
    return 'https://vijaysetu.piyushassudani.in/api';
  }
  return configuredApiUrl.replace(/\/+$/, '');
})();

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function isSuspensionResponse(status: number, data: any): boolean {
  if (status !== 403 || !data) return false;
  return (
    data?.code === 'ACCOUNT_SUSPENDED' ||
    (typeof data?.message === 'string' && (data.message.includes('बंद') || data.message.includes('disabled') || data.message.includes('Suspend')))
  );
}

function emitAccountSuspended(data: any) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('account_suspended', 'true');
  window.dispatchEvent(
    new CustomEvent('account-suspended', {
      detail: {
        name: data?.contact?.name || process.env.NEXT_PUBLIC_SUPPORT_BRAND || 'VijaySetu Support',
        phone: data?.contact?.phone || process.env.NEXT_PUBLIC_SUPPORT_PHONE || '',
        message: data?.message,
      },
    })
  );
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  const token = typeof window === 'undefined' ? null : window.localStorage.getItem('token');

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const selectedOrgId = typeof window === 'undefined' ? null : window.localStorage.getItem('selectedClientOrgId');
  if (selectedOrgId && selectedOrgId !== 'all' && !headers.has('x-organization-id')) {
    headers.set('x-organization-id', selectedOrgId);
  }

  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !headers.has('Idempotency-Key')) {
    headers.set('Idempotency-Key', createIdempotencyKey());
  }
  if (typeof window !== 'undefined' && !headers.has('X-Client-Timezone')) {
    headers.set('X-Client-Timezone', getClientTimeZone());
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const timeoutMs = isFormData ? 120000 : 30000;
  const controller = options.signal ? null : new AbortController();
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const res = await fetch(apiUrl(path), {
      ...options,
      headers,
      signal: options.signal || controller?.signal,
    });

    if (res.status === 403) {
      try {
        const data = await res.clone().json();
        if (isSuspensionResponse(res.status, data)) {
          emitAccountSuspended(data);
        }
      } catch {
        // ignore
      }
    }

    return res;
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError';
    console.warn('[Network] Connection failed to API:', err?.message || err);
    return new Response(
      JSON.stringify({
        message: isAbort
          ? 'अनुरोध में अधिक समय लग रहा है (Request Timeout)। कृपया इंटरनेट जांचें या दोबारा प्रयास करें।'
          : 'नेटवर्क कनेक्शन अनुपलब्ध है या धीमा है (Network connection error)। कृपया अपना इंटरनेट चेक करें और पुनः प्रयास करें।',
        error: err?.message || (isAbort ? 'TimeoutError' : 'NetworkError'),
      }),
      {
        status: isAbort ? 504 : 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Offline-first mutation helper: executes immediately when online and queues into IndexedDB outbox
 * with the same Idempotency-Key if the device is offline or receives a transient 503/504 failure.
 */
export async function resilientMutate(
  path: string,
  options: { method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; idempotencyKey?: string } = {}
): Promise<{ queued: boolean; ok: boolean; response: Response | null }> {
  const method = options.method || 'PUT';
  const idempotencyKey = options.idempotencyKey || createIdempotencyKey();

  const isOffline = typeof window !== 'undefined' && !window.navigator.onLine;
  if (isOffline) {
    await enqueueOfflineMutation({ path, method, body: options.body, idempotencyKey });
    return { queued: true, ok: true, response: null };
  }

  const res = await apiFetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 503 || res.status === 504 || res.status === 502) {
    await enqueueOfflineMutation({ path, method, body: options.body, idempotencyKey });
    return { queued: true, ok: true, response: res };
  }

  return { queued: false, ok: res.ok, response: res };
}

export async function getApiError(response: Response, fallback: string) {
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return 'आपका सेशन एक्सपायर हो गया है। कृपया दोबारा साइन इन करें।';
  }

  if (response.status === 429) {
    try {
      const data = await response.clone().json();
      if (typeof data?.message === 'string' && data.message.trim()) return data.message;
    } catch {
      // ignore
    }
    return 'बहुत अधिक अनुरोध भेजे गए हैं। कृपया कुछ क्षण रुककर पुनः प्रयास करें।';
  }

  if (response.status === 403) {
    try {
      const data = await response.clone().json();
      if (isSuspensionResponse(response.status, data)) {
        emitAccountSuspended(data);
        return data.message || 'आपका खाता एडमिन द्वारा बंद (Suspend) किया गया है। कृपया आगे की सेवा के लिए एडमिन से संपर्क करें।';
      }
    } catch {
      // ignore
    }
  }

  if (response.status === 413) {
    return 'फाइल का आकार बहुत बड़ा है (HTTP 413 Payload Too Large)। फाइल 100MB की सीमा से अधिक है। कृपया छोटी या कंप्रेस्ड PDF अपलोड करें।';
  }

  if (response.status === 504 || response.status === 502) {
    return `सर्वर से संपर्क नहीं हो पाया या टाइमआउट हो गया (HTTP ${response.status})। कृपया दोबारा प्रयास करें।`;
  }

  try {
    const text = await response.text();
    try {
      const body = JSON.parse(text);
      if (typeof body.message === 'string' && body.message.trim()) return body.message;
      if (typeof body.error === 'string' && body.error.trim()) return body.error;
      if (typeof body.details === 'string' && body.details.trim()) return body.details;
    } catch {
      if (text.includes('exceeded') || text.includes('too large') || text.includes('Entity Too Large')) {
        return 'फाइल का साइज 50MB सीमा से अधिक है। कृपया फाइल का साइज कम करें।';
      }
      if (text.length > 0 && text.length < 250 && !text.includes('<!DOCTYPE')) {
        return text;
      }
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Safely decodes a JWT token payload supporting full Unicode / UTF-8 characters (e.g. Hindi Devanagari)
 */
export function decodeJwtPayload<T = Record<string, any>>(token: string | null | undefined): T | null {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const binStr = atob(base64);
    const bytes = Uint8Array.from(binStr, (c) => c.charCodeAt(0));
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

