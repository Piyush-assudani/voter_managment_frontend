'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, Command, LoaderCircle, LockKeyhole, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch, getApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        throw new Error(await getApiError(response, 'साइन इन नहीं हो सका।'));
      }

      const result = await response.json();
      if (!result.token) {
        throw new Error('सर्वर से साइन इन टोकन नहीं मिला।');
      }
      window.localStorage.removeItem('account_suspended');
      window.localStorage.removeItem('selectedClientOrgId');
      window.localStorage.setItem('token', result.token);
      window.location.href = '/';
    } catch (loginError) {
      setError(loginError instanceof Error
        ? loginError.message
        : 'सर्वर से कनेक्ट नहीं हो सका। कृपया फिर कोशिश करें।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="auth-mark" style={{ padding: '6px', overflow: 'hidden' }}>
            <img src="/logo.png" alt="VijaySetu Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </span>
          <span><strong style={{ fontFamily: 'inherit' }}>VijaySetu</strong><small>FIELD OPERATIONS</small></span>
        </div>
        <div className="auth-heading">
          <span className="eyebrow-label">SECURE WORKSPACE</span>
          <h1>वापस स्वागत है</h1>
          <p>अपने ऑपरेशन्स डैशबोर्ड में साइन इन करें।</p>
        </div>
        <form className="auth-form" onSubmit={handleLogin}>
          <label htmlFor="email">ईमेल आईडी या यूज़रनेम</label>
          <input
            id="email"
            type="text"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ईमेल आईडी या यूज़रनेम लिखें (उदा. admin, demo_client)"
          />
          <div className="auth-password-label">
            <label htmlFor="password">पासवर्ड</label>
            <LockKeyhole size={14} />
          </div>
          <div className="relative flex items-center">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="अपना पासवर्ड दर्ज करें"
              className="w-full pr-10"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && (
            <div
              style={{
                marginTop: '12px',
                padding: '14px 16px',
                borderRadius: '12px',
                background: '#fef2f2',
                border: '1.5px solid #f87171',
                textAlign: 'left',
              }}
              role="alert"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontWeight: 800, fontSize: '14px', marginBottom: '6px' }}>
                <span>⛔</span>
                <span>{error.includes('बंद') || error.includes('Suspend') ? 'खाता बंद / निलंबित है' : 'साइन इन त्रुटि'}</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#7f1d1d', lineHeight: 1.5 }}>{error}</p>
              {(error.includes('बंद') || error.includes('Suspend')) && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #fecaca' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>
                    संपर्क करें: Roots Reach Media
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <a
                      href="tel:7231077770"
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: '#2563eb',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      📞 7231077770
                    </a>
                    <a
                      href="https://wa.me/917231077770?text=%E0%A4%A8%E0%A4%AE%E0%A4%B8%E0%A5%8D%E0%A4%A4%E0%A5%87%20Roots%20Reach%20Media%2C%20%E0%A4%AE%E0%A5%87%E0%A4%B0%E0%A4%BE%20%E0%A4%B5%E0%A4%BF%E0%A4%9C%E0%A4%AF%E0%A4%B8%E0%A5%87%E0%A4%A4%E0%A5%81%20%E0%A4%96%E0%A4%BE%E0%A4%A4%E0%A4%BE%20%E0%A4%8F%E0%A4%A1%E0%A4%AE%E0%A4%BF%E0%A4%A8%20%E0%A4%A6%E0%A5%8D%E0%A4%B5%E0%A4%BE%E0%A4%B0%E0%A4%BE%20%E0%A4%AC%E0%A4%82%E0%A4%A6%20(%E0%A4%A8%E0%A4%BF%E0%A4%B2%E0%A4%82%E0%A4%AC%E0%A4%BF%E0%A4%A4)%20%E0%A4%95%E0%A4%BF%E0%A4%AF%E0%A4%BE%20%E0%A4%97%E0%A4%AF%E0%A4%BE%20%E0%A4%B9%E0%A5%88%E0%A5%A4%20%E0%A4%95%E0%A5%83%E0%A4%AA%E0%A4%AF%E0%A4%BE%20%E0%A4%87%E0%A4%B8%E0%A5%87%20%E0%A4%AA%E0%A5%81%E0%A4%A8%E0%A4%83%20%E0%A4%9A%E0%A4%BE%E0%A4%B2%E0%A5%82%20%E0%A4%95%E0%A4%B0%E0%A5%87%E0%A4%82%E0%A5%A4"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: '#16a34a',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      💬 WhatsApp
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? <LoaderCircle size={16} className="spin" /> : <>साइन इन करें <ArrowRight size={16} /></>}
          </button>
        </form>
        <div className="auth-footer">
          <span className="status-dot status-checking" />
          <span>आपके संगठन के सुरक्षित ऑपरेशन्स पोर्टल में प्रवेश</span>
        </div>
      </section>
      <div className="auth-caption">
        &copy; 2026 VijaySetu &bull; Roots Reach Media. All Rights Reserved. &bull; <a href="https://vijaysetu-website.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color: '#27332d', fontWeight: 600, textDecoration: 'underline' }}>वेबसाइट</a> &bull; <a href="/privacy" style={{ color: '#27332d', fontWeight: 600, textDecoration: 'underline' }}>Privacy Policy</a> &bull; <a href="/terms" style={{ color: '#27332d', fontWeight: 600, textDecoration: 'underline' }}>Terms of Service</a> &bull; 📞 7231077770
      </div>
    </main>
  );
}
