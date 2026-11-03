'use client';

import React, { useEffect, useState } from 'react';
import { X, Download, ShieldCheck, User, AlertCircle, RefreshCw, LoaderCircle } from 'lucide-react';

export interface VoterPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  voter?: {
    nameHi?: string;
    nameEn?: string;
    epic?: string;
    serialNo?: number | string;
    wardNo?: string;
    partNo?: string;
    houseNo?: string;
    photoUrl?: string;
  } | null;
}

export const VoterPhotoModal: React.FC<VoterPhotoModalProps> = ({ isOpen, onClose, voter }) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState<number>(0);
  const [downloading, setDownloading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset image status whenever voter or modal open state changes
  useEffect(() => {
    if (isOpen && voter?.photoUrl) {
      setImageState('loading');
      setRetryCount(0);
      setDownloading(false);
    } else {
      setImageState('error');
    }
  }, [isOpen, voter?.photoUrl]);

  if (!isOpen || !voter) return null;

  const voterName = voter.nameHi || voter.nameEn || 'मतदाता';
  const hasPhoto = Boolean(voter.photoUrl && voter.photoUrl.trim() !== '');

  const handleDownload = async () => {
    if (!voter.photoUrl || downloading) return;
    setDownloading(true);
    const cleanEpic = (voter.epic || 'voter').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const filename = `${cleanEpic}_photo.webp`;

    try {
      // 1. Direct Cloudinary attachment transformation if available (forces download header)
      if (voter.photoUrl.includes('cloudinary.com') && voter.photoUrl.includes('/upload/')) {
        const downloadUrl = voter.photoUrl.replace('/upload/', `/upload/fl_attachment:${cleanEpic}/`);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setDownloading(false);
        return;
      }

      // 2. Fetch as blob (ensures native browser download without opening new tab)
      const res = await fetch(voter.photoUrl);
      if (!res.ok) throw new Error('Fetch failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      // 3. Fallback: Open in new tab
      window.open(voter.photoUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const handleRetry = () => {
    setImageState('loading');
    setRetryCount((prev) => prev + 1);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '380px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px -8px rgba(15, 23, 42, 0.35)',
          border: '1.5px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #2563eb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} style={{ color: '#60a5fa' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.02em' }}>
              मतदाता फोटो पूर्वावलोकन
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="बंद करें"
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Image Container */}
        <div
          style={{
            padding: '24px 20px 16px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8fafc',
            minHeight: '260px',
          }}
        >
          {hasPhoto ? (
            <div
              style={{
                width: '180px',
                height: '225px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '3px solid #ffffff',
                boxShadow: '0 10px 25px -4px rgba(15, 23, 42, 0.22)',
                background: '#e2e8f0',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Spinner while loading */}
              {imageState === 'loading' && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f1f5f9',
                    gap: '6px',
                  }}
                >
                  <LoaderCircle size={24} style={{ color: '#2563eb', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '11px', color: '#64748b' }}>फोटो लोड हो रही है...</span>
                </div>
              )}

              {/* Error fallback state */}
              {imageState === 'error' && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#fef2f2',
                    padding: '12px',
                    textAlign: 'center',
                    gap: '6px',
                  }}
                >
                  <AlertCircle size={28} style={{ color: '#ef4444' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b' }}>
                    फोटो लोड नहीं हो सकी
                  </span>
                  <span style={{ fontSize: '10.5px', color: '#7f1d1d' }}>
                    नेटवर्क कनेक्शन जांचें
                  </span>
                  <button
                    type="button"
                    onClick={handleRetry}
                    style={{
                      marginTop: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={11} /> पुनः प्रयास करें
                  </button>
                </div>
              )}

              {/* Main Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={`${voter.photoUrl}_${retryCount}`}
                src={voter.photoUrl}
                alt={voterName}
                onLoad={() => setImageState('loaded')}
                onError={() => setImageState('error')}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: imageState === 'error' ? 'none' : 'block',
                }}
              />
            </div>
          ) : (
            <div
              style={{
                width: '180px',
                height: '225px',
                borderRadius: '12px',
                border: '2px dashed #cbd5e1',
                background: '#f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#64748b',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <User size={48} style={{ color: '#94a3b8' }} />
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                फोटो उपलब्ध नहीं है
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                यह सूची बिना फोटो विकल्प से अपलोड की गई है
              </div>
            </div>
          )}
        </div>

        {/* Voter Details Body */}
        <div style={{ padding: '16px 20px', background: '#ffffff' }}>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              {voterName}
            </h3>
            {voter.nameEn && voter.nameEn !== voterName && (
              <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                ({voter.nameEn})
              </p>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              fontSize: '12px',
              background: '#f8fafc',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <span style={{ color: '#64748b' }}>EPIC No:</span>{' '}
              <strong style={{ color: '#1e40af' }}>{voter.epic || '—'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>क्रम संख्या:</span>{' '}
              <strong style={{ color: '#0f172a' }}>{voter.serialNo || '—'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>वार्ड नं.:</span>{' '}
              <strong style={{ color: '#0f172a' }}>{voter.wardNo || '—'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>भाग / बूथ:</span>{' '}
              <strong style={{ color: '#0f172a' }}>{voter.partNo || '—'}</strong>
            </div>
            {voter.houseNo && (
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: '#64748b' }}>मकान संख्या:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{voter.houseNo}</strong>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            {hasPhoto && imageState !== 'error' && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: downloading ? '#93c5fd' : '#2563eb',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: downloading ? 'wait' : 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                {downloading ? (
                  <>
                    <LoaderCircle size={15} style={{ animation: 'spin 1s linear infinite' }} /> डाउनलोड हो रहा है...
                  </>
                ) : (
                  <>
                    <Download size={15} /> फोटो डाउनलोड
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: hasPhoto && imageState !== 'error' ? undefined : 1,
                padding: '9px 16px',
                borderRadius: '8px',
                background: '#f1f5f9',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 700,
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
              }}
            >
              बंद करें
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
