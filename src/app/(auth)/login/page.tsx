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
      window.localStorage.setItem('token', result.token);
      router.push('/');
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
          <label htmlFor="email">ईमेल पता या यूज़रनेम</label>
          <input
            id="email"
            type="text"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
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
          {error && <p className="auth-error" role="alert">{error}</p>}
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
        &copy; 2026 VijaySetu. All Rights Reserved. &bull; <a href="/privacy" style={{ color: '#27332d', fontWeight: 600, textDecoration: 'underline' }}>Privacy Policy</a> &bull; <a href="/terms" style={{ color: '#27332d', fontWeight: 600, textDecoration: 'underline' }}>Terms of Service</a>
      </div>
    </main>
  );
}
