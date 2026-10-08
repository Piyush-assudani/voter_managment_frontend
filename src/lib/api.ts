const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

export const API_BASE_URL = (configuredApiUrl || 'https://vijaysetu.piyushassudani.in/api').replace(/\/+$/, '');

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
  try {
    const body = await response.json();
    return typeof body.message === 'string' ? body.message : fallback;
  } catch {
    return fallback;
  }
}
