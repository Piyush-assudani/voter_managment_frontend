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
