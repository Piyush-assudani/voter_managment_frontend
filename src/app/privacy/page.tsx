import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - VijaySetu Election Platform & Meta WhatsApp Services',
  description: 'Official Privacy Policy for VijaySetu Election Campaign Management Platform and Meta WhatsApp Business Messaging services.',
};

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)', color: '#ffffff', padding: '40px 20px', textAlign: 'center', borderBottom: '3px solid #ea580c' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '26px', fontWeight: 800, marginBottom: '8px' }}>
          <span>VijaySetu</span>
          <span style={{ background: '#ea580c', color: '#ffffff', fontSize: '11px', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase', fontWeight: 700 }}>
            Election Portal
          </span>
        </div>
        <p style={{ color: '#93c5fd', fontSize: '14px', maxWidth: '650px', margin: '0 auto' }}>
          Candidate Campaign Management, Voter Information Slip Dispatch & Meta WhatsApp Business Platform
        </p>
        <div style={{ display: 'inline-block', marginTop: '14px', background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', color: '#cbd5e1' }}>
          Compliance with Meta WhatsApp Business Policies &amp; Indian Information Technology Rules
        </div>
      </header>

      <main style={{ maxWidth: '860px', margin: '30px auto', padding: '0 20px 60px' }}>
        <article style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '36px 32px', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1e3a8a', marginBottom: '8px' }}>Privacy Policy</h1>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
            Effective Date: <strong>October 10, 2026</strong> &bull; Last Updated: <strong>October 2026</strong>
          </div>

          <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '10px', padding: '16px 20px', margin: '20px 0' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#25d366', color: '#ffffff', padding: '2px 10px', borderRadius: '14px', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
              Meta WhatsApp Cloud API Compliance
            </span>
            <strong style={{ display: 'block', color: '#1e3a8a', marginBottom: '6px' }}>Overview of Data Protection Commitment</strong>
            <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
              VijaySetu (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting the privacy of candidates, campaign workers, and voters. This Privacy Policy details how we handle user data and voter details during election campaign communication, voter slip generation, and WhatsApp message delivery.
            </p>
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '28px 0 12px' }}>1. Information We Collect</h2>
          <p style={{ fontSize: '14.5px', color: '#475569', lineHeight: 1.65, marginBottom: '14px' }}>
            We process information exclusively to provide election campaign operations and voter slip assistance:
          </p>
          <ul style={{ paddingLeft: '22px', fontSize: '14.5px', color: '#475569', lineHeight: 1.65, marginBottom: '16px' }}>
            <li style={{ marginBottom: '8px' }}><strong>Account Information:</strong> Name, phone number, email address, and authentication credentials of authorized candidates and election workers.</li>
            <li style={{ marginBottom: '8px' }}><strong>Voter Information (Public Electoral Registry):</strong> Voter names, age, gender, relation, house number, ward number, part number, and serial number as published in public election roll registries.</li>
            <li style={{ marginBottom: '8px' }}><strong>Recipient Contact Information:</strong> Mobile phone numbers entered by campaign workers or voters requesting their digital voter information slip (parchi) via WhatsApp.</li>
            <li style={{ marginBottom: '8px' }}><strong>Messaging Metadata:</strong> WhatsApp message delivery timestamps, transmission status (sent, delivered, read, failed), and error codes through the Meta WhatsApp Business Cloud API.</li>
          </ul>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '28px 0 12px' }}>2. How We Use Information &amp; Meta WhatsApp Services</h2>
          <p style={{ fontSize: '14.5px', color: '#475569', lineHeight: 1.65, marginBottom: '14px' }}>
            Data collected is used strictly for the following purposes:
          </p>
          <ul style={{ paddingLeft: '22px', fontSize: '14.5px', color: '#475569', lineHeight: 1.65, marginBottom: '16px' }}>
            <li style={{ marginBottom: '8px' }}>Generating customized voter information slips (मतदाता सूचना पर्ची) displaying the voter&apos;s booth location, serial number, and candidate details.</li>
            <li style={{ marginBottom: '8px' }}>Delivering informational voter slips to voters&apos; mobile numbers via the Meta WhatsApp Business API upon request.</li>
            <li style={{ marginBottom: '8px' }}>Managing booth-level volunteer assignments and tracking campaign outreach.</li>
            <li style={{ marginBottom: '8px' }}>Verifying delivery status of official campaign announcements and poll desk notifications.</li>
          </ul>

          <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '10px', padding: '16px 20px', margin: '20px 0' }}>
            <strong style={{ color: '#166534', display: 'block', marginBottom: '6px' }}>Explicit Prohibition of Commercial Data Resale</strong>
            <p style={{ margin: 0, color: '#166534', fontSize: '14px', lineHeight: 1.6 }}>
              We do not sell, rent, monetize, or trade voter databases or user contact numbers to any third-party advertisers, commercial marketing firms, or external commercial entities under any circumstances.
            </p>
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '28px 0 12px' }}>3. Meta WhatsApp API Integration &amp; Messaging Policies</h2>
          <ul style={{ paddingLeft: '22px', fontSize: '14.5px', color: '#475569', lineHeight: 1.65, marginBottom: '16px' }}>
            <li style={{ marginBottom: '8px' }}><strong>Template Messages:</strong> All automated WhatsApp notifications utilize pre-approved Meta message templates for voter slip distribution and campaign alerts.</li>
            <li style={{ marginBottom: '8px' }}><strong>Opt-In &amp; Consent:</strong> Messages are sent only to numbers provided by campaign volunteers or directly requested by voters seeking polling booth information.</li>
            <li style={{ marginBottom: '8px' }}><strong>Opt-Out Mechanism:</strong> Recipients can unsubscribe from campaign messages at any moment by replying with <strong>&quot;STOP&quot;</strong>, <strong>&quot;UNSUBSCRIBE&quot;</strong>, or <strong>&quot;बंद करें&quot;</strong>.</li>
            <li style={{ marginBottom: '8px' }}><strong>Delivery Logs:</strong> Real-time delivery receipts received via the Meta Webhook (<code>/api/whatsapp/webhook</code>) are maintained only for quota accounting and service reliability auditing.</li>
          </ul>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '28px 0 12px' }}>4. Grievance Redressal &amp; Contact Details</h2>
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px 18px', fontSize: '14px', lineHeight: 1.6 }}>
            <strong>Agency &amp; Compliance Desk:</strong> Roots Reach Media &bull; VijaySetu Support<br />
            <strong>Helpline / WhatsApp:</strong> <a href="https://wa.me/917231077770" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>+91 72310 77770</a><br />
            <strong>कॉल:</strong> <a href="tel:+917231077770" style={{ color: '#2563eb' }}>+91 72310 77770</a><br />
            <strong>Official Portal:</strong> <a href="https://vijaysetu-website.vercel.app" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>आधिकारिक वेबसाइट</a>
          </div>
        </article>
      </main>

      <footer style={{ textAlign: 'center', padding: '24px 20px', fontSize: '13px', color: '#64748b', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
        &copy; 2026 VijaySetu. All Rights Reserved. &bull; <Link href="/terms" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</Link> &bull; <Link href="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Dashboard</Link>
      </footer>
    </div>
  );
}
