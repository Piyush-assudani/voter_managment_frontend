'use client';

import React, { useState } from 'react';
import { Check, Copy, Download, ExternalLink, X, Image as ImageIcon } from 'lucide-react';
import { copySlipImageToClipboard } from '@/lib/whatsappShare';
import { downloadDataUrl } from '@/lib/fileDownload';

export interface WhatsAppWebHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  voterName: string;
  epic?: string;
  imageDataUrl?: string;
  waLink?: string;
}

export function WhatsAppWebHelperModal({
  isOpen,
  onClose,
  voterName,
  epic,
  imageDataUrl,
  waLink,
}: WhatsAppWebHelperModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyAgain = async () => {
    if (!imageDataUrl) return;
    const ok = await copySlipImageToClipboard(imageDataUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleDownloadAgain = () => {
    if (!imageDataUrl) return;
    downloadDataUrl(imageDataUrl, `VoterSlip_${epic || 'slip'}.jpg`);
  };

  const handleReopenWhatsApp = () => {
    if (waLink) {
      window.open(waLink, '_blank');
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      style={{ zIndex: 99999, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="form-modal"
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: '540px',
          width: '95%',
          borderRadius: '16px',
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          padding: '0',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            color: '#ffffff',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ImageIcon size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                📸 मतदाता पर्ची फोटो तैयार है!
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#d1fae5' }}>
                {voterName} {epic ? `• ${epic}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
            aria-label="बंद करें"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Main instruction box */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '12px',
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#166534', marginBottom: '8px' }}>
              👉 WhatsApp Web में पर्ची (फोटो) कैसे भेजें:
            </div>
            <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#14532d', lineHeight: '1.6' }}>
              <li>
                खुल चुकी <strong>WhatsApp Web चैट</strong> पर क्लिक करें।
              </li>
              <li>
                अपने कीबोर्ड पर <strong style={{ color: '#047857', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>Cmd + V</strong> (Windows पर <strong style={{ color: '#047857', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>Ctrl + V</strong>) दबाएँ।
              </li>
              <li>
                <strong>पर्ची/पैम्फलेट की फोटो तुरंत चैट में अटैच हो जाएगी!</strong>
              </li>
              <li>बस <strong>Send (Enter)</strong> बटन दबा दें।</li>
            </ol>
          </div>

          {/* Slip thumbnail preview */}
          {imageDataUrl && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageDataUrl}
                alt="मतदाता पर्ची"
                style={{
                  width: '64px',
                  height: '80px',
                  objectFit: 'cover',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                  {voterName} की डिजिटल मतदाता पर्ची
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  क्लिपबोर्ड में कॉपी हो चुकी है और आपके कंप्यूटर में डाउनलोड भी हो चुकी है।
                </div>
              </div>
            </div>
          )}

          {/* Quick buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={handleCopyAgain}
              style={{
                padding: '10px 14px',
                background: copied ? '#dcfce7' : '#ffffff',
                border: copied ? '1.5px solid #22c55e' : '1.5px solid #cbd5e1',
                color: copied ? '#15803d' : '#1e293b',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              {copied ? <Check size={15} color="#15803d" /> : <Copy size={15} />}
              {copied ? 'फोटो कॉपी हो गई!' : '📋 फोटो दोबारा कॉपी करें'}
            </button>

            <button
              type="button"
              onClick={handleDownloadAgain}
              style={{
                padding: '10px 14px',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#1e293b',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Download size={15} /> 📥 फोटो डाउनलोड करें
            </button>
          </div>

          {waLink && (
            <button
              type="button"
              onClick={handleReopenWhatsApp}
              style={{
                padding: '10px 14px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#047857',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <ExternalLink size={15} /> 💬 WhatsApp Web फिर से खोलें
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px',
              background: '#047857',
              border: 'none',
              color: '#ffffff',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ✓ ठीक है, समझ गया (Got It)
          </button>
        </div>
      </div>
    </div>
  );
}
