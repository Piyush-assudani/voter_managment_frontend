import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - VijaySetu Election Platform & Meta WhatsApp Services',
  description: 'Official Terms of Service for VijaySetu Election Campaign Management Platform and Meta WhatsApp Business API integration.',
};

export default function TermsPage() {
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
          Terms of Service &amp; Acceptable Messaging Usage Agreement
        </p>
      </header>

      <main style={{ maxWidth: '860px', margin: '30px auto', padding: '0 20px 60px' }}>
        <article style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '36px 32px', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1e3a8a', marginBottom: '8px' }}>Terms of Service</h1>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
            Effective Date: <strong>October 10, 2026</strong> &bull; Last Updated: <strong>October 2026</strong>
          </div>

          <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '10px', padding: '16px 20px', margin: '20px 0' }}>
            <strong style={{ color: '#1e3a8a', display: 'block', marginBottom: '6px' }}>Binding Agreement</strong>
            <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
              These Terms of Service govern your access to and usage of the VijaySetu web application, backend API, voter slip management utilities, and associated Meta WhatsApp Business Messaging features. By logging into or using this platform, you agree to these terms in full.
            </p>
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '28px 0 12px' }}>1. Permitted Purpose &amp; Scope of Use</h2>
          <p style={{ fontSize: '14.5px', color: '#475569', lineHeight: 1.65, marginBottom: '14px' }}>
            VijaySetu is intended strictly for legitimate election campaign operations, booth volunteer coordination, voter slip generation, and informational outreach by authorized political parties, candidates, and campaign teams in accordance with democratic and statutory frameworks.
          </p>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '28px 0 12px' }}>2. Meta WhatsApp Business Usage Requirements</h2>
          <p style={{ fontSize: '14.5px', color: '#475569', lineHeight: 1.65, marginBottom: '14px' }}>
            When utilizing our WhatsApp automated dispatch and messaging capabilities, all users and campaign administrators agree to:
          </p>
          <ul style={{ paddingLeft: '22px', fontSize: '14.5px', color: '#475569', lineHeight: 1.65, marginBottom: '16px' }}>
            <li style={{ marginBottom: '8px' }}>Strictly adhere to <strong>Meta&apos;s WhatsApp Business Messaging Policy</strong>, Commerce Policy, and Technical Guidelines.</li>
            <li style={{ marginBottom: '8px' }}>Transmit messages exclusively for informational election notices, voter booth guidance, and digital voter slip distribution.</li>
            <li style={{ marginBottom: '8px' }}>Refrain from dispatching unauthorized bulk spam, harassment, hate speech, defamatory content, or misinformation.</li>
            <li style={{ marginBottom: '8px' }}>Honor recipient opt-out requests (&quot;STOP&quot; / &quot;UNSUBSCRIBE&quot;) immediately and without condition.</li>
          </ul>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '28px 0 12px' }}>3. User Accounts &amp; Access Controls</h2>
          <p style={{ fontSize: '14.5px', color: '#475569', lineHeight: 1.65, marginBottom: '14px' }}>
            Access to VijaySetu is segregated by Role-Based Access Control (RBAC). Super Administrators maintain complete tenant oversight; campaign workers and client accounts are restricted to permitted wards and voter search functions. Sharing credentials across unauthorized third parties is strictly prohibited.
          </p>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '28px 0 12px' }}>4. Compliance with Election Commission of India (ECI) Laws</h2>
          <p style={{ fontSize: '14.5px', color: '#475569', lineHeight: 1.65, marginBottom: '14px' }}>
            Users are exclusively responsible for ensuring that all campaign content, appeal texts, and distribution schedules comply with the Model Code of Conduct (MCC), ECI statutory silence periods (e.g., 48 hours prior to poll close), and applicable electoral spending regulations.
          </p>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '28px 0 12px' }}>5. Contact Information</h2>
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px 18px', fontSize: '14px', lineHeight: 1.6 }}>
            <strong>Legal Desk:</strong> Roots Reach Media &bull; VijaySetu Legal Operations<br />
            <strong>Helpline / WhatsApp:</strong> <a href="https://wa.me/917231077770" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>+91 72310 77770</a><br />
            <strong>कॉल:</strong> <a href="tel:+917231077770" style={{ color: '#2563eb' }}>+91 72310 77770</a><br />
            <strong>Official Portal:</strong> <a href="https://vijaysetu-website.vercel.app" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>आधिकारिक वेबसाइट</a>
          </div>
        </article>
      </main>

      <footer style={{ textAlign: 'center', padding: '24px 20px', fontSize: '13px', color: '#64748b', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
        &copy; 2026 VijaySetu. All Rights Reserved. &bull; <a href="/privacy" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</a> &bull; <a href="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Dashboard</a>
      </footer>
    </div>
  );
}
