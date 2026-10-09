const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

export const API_BASE_URL = (() => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    // When developing on localhost, route through local Next.js proxy to bypass CORS
    if (!configuredApiUrl || configuredApiUrl.includes('vijaysetu.piyushassudani.in') || configuredApiUrl === '/api') {
      return '/api';
    }
  }
  return (configuredApiUrl || 'https://vijaysetu.piyushassudani.in/api').replace(/\/+$/, '');
})();

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function apiFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  const token = typeof window === 'undefined' ? null : window.localStorage.getItem('token');

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(apiUrl(path), { ...options, headers });
}

export async function getApiError(response: Response, fallback: string) {
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return 'आपका सेशन एक्सपायर हो गया है। कृपया दोबारा साइन इन करें।';
  }

  if (response.status === 413) {
    return 'फाइल का आकार बहुत बड़ा है (HTTP 413 Payload Too Large)। फाइल 50MB की सीमा से अधिक है। कृपया छोटी या कंप्रेस्ड PDF अपलोड करें।';
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
