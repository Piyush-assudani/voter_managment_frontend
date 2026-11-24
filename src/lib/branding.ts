/**
 * Per-client branding for the dashboard footer and contact boxes.
 * Clients not listed here keep the default VijaySetu / Roots Reach Media branding.
 */
export interface ClientBranding {
  company: string;
  phone: string; // 10-digit Indian mobile
  showDefaultLinks: boolean; // website / privacy / terms links of the default brand
  gujaratiUi?: boolean; // show the whole dashboard in Gujarati
}

export const DEFAULT_BRANDING: ClientBranding = {
  company: 'Roots Reach Media',
  phone: '7231077770',
  showDefaultLinks: true,
};

export const PRATAP_ORG_ID = 'tenant_c6f65ce9-2547-4b16-8dc3-76c460fc2230';

const CLIENT_BRANDING: Record<string, ClientBranding> = {
  // Dr Pratapsinh Rajput
  [PRATAP_ORG_ID]: { company: 'Assudani Developers', phone: '9413879444', showDefaultLinks: false, gujaratiUi: true },
};

export function getClientBranding(orgId?: string | null): ClientBranding {
  return (orgId && CLIENT_BRANDING[orgId]) || DEFAULT_BRANDING;
}

export function formatPhone(phone: string): string {
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
}

/**
 * True when the dashboard is showing a client whose panel is in Gujarati
 * (tenant user of that org, or an admin who selected it). Synchronous so slip
 * templates can use it while rendering.
 */
export function isGujaratiPanelActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const token = window.localStorage.getItem('token') || '';
    const payload = JSON.parse(decodeURIComponent(escape(atob((token.split('.')[1] || '').replace(/-/g, '+').replace(/_/g, '/')))));
    const user = payload?.user || {};
    const orgId = user.role === 'admin' ? window.localStorage.getItem('selectedClientOrgId') : user.organizationId;
    return Boolean(getClientBranding(orgId).gujaratiUi) && !window.location.pathname.startsWith('/admin');
  } catch {
    return false;
  }
}
