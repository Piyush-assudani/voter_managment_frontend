'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Caught Error Boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-slate-800/80 border border-slate-700/80 backdrop-blur-xl p-8 rounded-3xl max-w-md w-full shadow-2xl flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5">
          <AlertTriangle size={32} />
        </div>

        <h1 className="text-xl font-bold text-white mb-2">
          कुछ अप्रत्याशित समस्या आई
        </h1>
        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          सिस्टम सुरक्षित है। डेटा या नेटवर्क की किसी अस्थायी समस्या के कारण यह स्क्रीन आई है। आप नीचे दिए बटन से तुरंत पुनः प्रयास कर सकते हैं।
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold py-3 px-4 rounded-xl transition duration-150 shadow-lg shadow-emerald-900/30 text-sm"
          >
            <RotateCcw size={16} />
            <span>पुनः प्रयास करें</span>
          </button>

          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 font-semibold py-3 px-4 rounded-xl transition duration-150 text-sm"
          >
            <Home size={16} />
            <span>होम पेज</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
