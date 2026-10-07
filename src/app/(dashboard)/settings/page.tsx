'use client';

import { FormEvent, useState } from 'react';
import { KeyRound, LoaderCircle, CheckCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { apiFetch, getApiError } from '@/lib/api';

export default function SettingsPage() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChangePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (newPassword !== confirmPassword) {
      setError('नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते।');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      
      if (!response.ok) {
        throw new Error(await getApiError(response, 'पासवर्ड नहीं बदला जा सका।'));
      }
      
      setSuccess('आपका पासवर्ड सफलतापूर्वक बदल दिया गया है।');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'पासवर्ड बदलने में त्रुटि।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="directory-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow-label"><span className="eyebrow-mark" /> SECURITY</div>
          <h1>सेटिंग्स (Settings)</h1>
          <p>अपने खाते की सुरक्षा और पासवर्ड अपडेट करें।</p>
        </div>
      </div>

      <section className="directory-panel max-w-xl">
        <div className="panel-heading mb-6">
          <div>
            <h2>पासवर्ड बदलें (Change Password)</h2>
            <p>कृपया अपना पुराना और नया पासवर्ड दर्ज करें।</p>
          </div>
          <span className="panel-icon bg-indigo-50 text-indigo-600 p-2 rounded-lg"><KeyRound size={20} /></span>
        </div>
        
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center text-emerald-800">
            <CheckCircle className="mr-3 text-emerald-500" size={20} />
            <p className="font-medium text-sm">{success}</p>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
            <p className="font-medium text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">पुराना पासवर्ड</label>
            <div className="relative flex items-center">
              <input
                type={showOld ? "text" : "password"}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm pr-10"
                placeholder="पुराना पासवर्ड"
              />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 text-gray-400 hover:text-gray-600">
                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">नया पासवर्ड</label>
            <div className="relative flex items-center">
              <input
                type={showNew ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm pr-10"
                placeholder="नया पासवर्ड (कम से कम 8 अक्षर)"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">नए पासवर्ड की पुष्टि करें</label>
            <input
              type={showNew ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
              placeholder="नया पासवर्ड दोबारा दर्ज करें"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <LoaderCircle size={18} className="animate-spin" /> : <>पासवर्ड बदलें (Change Password) <ArrowRight size={18} className="ml-2" /></>}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
