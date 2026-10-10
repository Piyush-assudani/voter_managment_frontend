'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Maximize2, Check } from 'lucide-react';

export interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  title?: string;
  subtitle?: string;
  initialAspectRatio?: number; // 1 for square, 4/1 for banner, or 0 for free
  onCropComplete: (croppedBase64: string) => void;
  onClose: () => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  title = 'Crop your photo (फोटो क्रॉप करें)',
  subtitle = 'Drag the image to reposition it, use the slider to zoom in or out, and drag the corners of the white square to pick the area you want to use. (फोटो को सही स्थिति में लाने के लिए ड्रैग करें, ज़ूम स्लाइडर से आकार सेट करें और एरिया चुनें)',
  initialAspectRatio = 1,
  onCropComplete,
  onClose,
}) => {
  const [aspectRatio, setAspectRatio] = useState<number>(initialAspectRatio);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  // Pan offset of image relative to container center
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Crop box dimensions and center offset in container
  const [cropBox, setCropBox] = useState({ width: 260, height: 260, x: 0, y: 0 });

  // Dragging states
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0, boxW: 0, boxH: 0, boxX: 0, boxY: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state whenever new image opens
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setAspectRatio(initialAspectRatio);
      setImageLoaded(false);

      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        setImageLoaded(true);

        const baseSize = 250;
        if (initialAspectRatio && initialAspectRatio > 0) {
          if (initialAspectRatio >= 1) {
            setCropBox({
              width: baseSize,
              height: Math.round(baseSize / initialAspectRatio),
              x: 0,
              y: 0,
            });
          } else {
            setCropBox({
              width: Math.round(baseSize * initialAspectRatio),
              height: baseSize,
              x: 0,
              y: 0,
            });
          }
        } else {
          setCropBox({ width: baseSize, height: baseSize, x: 0, y: 0 });
        }
      };
    }
  }, [isOpen, imageSrc, initialAspectRatio]);

  // Adjust crop box when aspect ratio changes
  const handleSetAspectRatio = (ratio: number) => {
    setAspectRatio(ratio);
    const baseW = 250;
    if (ratio === 0) {
      // Free
      setCropBox((prev) => ({ ...prev }));
    } else if (ratio >= 1) {
      const h = Math.round(baseW / ratio);
      setCropBox({ width: baseW, height: h, x: 0, y: 0 });
    } else {
      const w = Math.round(baseW * ratio);
      setCropBox({ width: w, height: baseW, x: 0, y: 0 });
    }
  };

  // Zoom handlers
  const handleZoomChange = (newZoom: number) => {
    setZoom(Math.max(1, Math.min(3.5, Number(newZoom.toFixed(2)))));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    handleZoomChange(zoom + delta);
  };

  // Drag start
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, handle: string | null = null) => {
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (handle) {
      setActiveHandle(handle);
    } else {
      setIsDraggingImage(true);
    }

    dragStartRef.current = {
      x: clientX,
      y: clientY,
      panX: pan.x,
      panY: pan.y,
      boxW: cropBox.width,
      boxH: cropBox.height,
      boxX: cropBox.x,
      boxY: cropBox.y,
    };
  };

  // Drag move
  const handleMouseMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;

      if (isDraggingImage) {
        setPan({
          x: dragStartRef.current.panX + dx,
          y: dragStartRef.current.panY + dy,
        });
      } else if (activeHandle) {
        const { boxW, boxH } = dragStartRef.current;
        let newW = boxW;
        let newH = boxH;

        if (activeHandle === 'se') {
          newW = Math.max(90, Math.min(360, boxW + dx));
          newH = aspectRatio > 0 ? Math.round(newW / aspectRatio) : Math.max(80, Math.min(340, boxH + dy));
        } else if (activeHandle === 'sw') {
          newW = Math.max(90, Math.min(360, boxW - dx));
          newH = aspectRatio > 0 ? Math.round(newW / aspectRatio) : Math.max(80, Math.min(340, boxH + dy));
        } else if (activeHandle === 'ne') {
          newW = Math.max(90, Math.min(360, boxW + dx));
          newH = aspectRatio > 0 ? Math.round(newW / aspectRatio) : Math.max(80, Math.min(340, boxH - dy));
        } else if (activeHandle === 'nw') {
          newW = Math.max(90, Math.min(360, boxW - dx));
          newH = aspectRatio > 0 ? Math.round(newW / aspectRatio) : Math.max(80, Math.min(340, boxH - dy));
        }

        setCropBox((prev) => ({
          ...prev,
          width: newW,
          height: newH,
        }));
      }
    },
    [isDraggingImage, activeHandle, aspectRatio]
  );

  // Drag end
  const handleMouseUp = useCallback(() => {
    setIsDraggingImage(false);
    setActiveHandle(null);
  }, []);

  useEffect(() => {
    if (isDraggingImage || activeHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDraggingImage, activeHandle, handleMouseMove, handleMouseUp]);

  // Execute Canvas Crop and Export (Exact Screen Match at 2x High-DPI Resolution)
  const handleCropAndUpload = () => {
    if (!naturalSize.width || !naturalSize.height) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      const containerW = containerRef.current?.clientWidth || 400;
      const containerH = containerRef.current?.clientHeight || 350;

      // Fit scale of image inside container viewport
      const fitScale = Math.min(
        (containerW * 0.85) / naturalSize.width,
        (containerH * 0.85) / naturalSize.height
      );
      const currentScale = fitScale * zoom;

      // 2x Retina canvas size based on cropBox
      const outW = Math.max(200, Math.round(cropBox.width * 2));
      const outH = Math.max(200, Math.round(cropBox.height * 2));

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Crisp background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);

      // Relative vector from cropBox center to image center in viewport
      const vectorX = pan.x - cropBox.x;
      const vectorY = pan.y - cropBox.y;

      const canvasImgCenterX = outW / 2 + vectorX * 2;
      const canvasImgCenterY = outH / 2 + vectorY * 2;

      ctx.save();
      ctx.translate(canvasImgCenterX, canvasImgCenterY);
      ctx.rotate((rotation * Math.PI) / 180);

      const renderW = naturalSize.width * currentScale * 2;
      const renderH = naturalSize.height * currentScale * 2;

      ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);
      ctx.restore();

      const croppedResult = canvas.toDataURL('image/jpeg', 0.92);
      onCropComplete(croppedResult);
      onClose();
    };
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Meta style) */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Subtitle / Instructions (Matches Meta Screenshot text) */}
        <div style={{ padding: '12px 20px 10px', fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
          {subtitle}
        </div>

        {/* Main Crop Area Viewport (Dark Background with Dimmed Mask & White Box) */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          style={{
            position: 'relative',
            height: '340px',
            background: '#334155',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isDraggingImage ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
          onMouseDown={(e) => handleMouseDown(e, null)}
          onTouchStart={(e) => handleMouseDown(e, null)}
        >
          {/* Background Image undergoing pan, zoom and rotation */}
          {imageLoaded && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop Source"
              draggable={false}
              style={{
                position: 'absolute',
                maxHeight: '85%',
                maxWidth: '85%',
                objectFit: 'contain',
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transition: isDraggingImage ? 'none' : 'transform 0.08s ease-out',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Semi-transparent Dimmed Mask Overlay outside the Crop Box */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.58)`,
              width: `${cropBox.width}px`,
              height: `${cropBox.height}px`,
              left: `calc(50% - ${cropBox.width / 2}px + ${cropBox.x}px)`,
              top: `calc(50% - ${cropBox.height / 2}px + ${cropBox.y}px)`,
            }}
          />

          {/* The White Crop Box (With Rule-of-Thirds Grid & Corner Handles) */}
          <div
            style={{
              position: 'absolute',
              width: `${cropBox.width}px`,
              height: `${cropBox.height}px`,
              left: `calc(50% - ${cropBox.width / 2}px + ${cropBox.x}px)`,
              top: `calc(50% - ${cropBox.height / 2}px + ${cropBox.y}px)`,
              border: '2px solid #ffffff',
              boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.25)',
              pointerEvents: 'none',
            }}
          >
            {/* Rule of Thirds Grid Lines */}
            <div
              style={{
                position: 'absolute',
                left: '33.33%',
                top: 0,
                bottom: 0,
                width: '1px',
                background: 'rgba(255, 255, 255, 0.4)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '66.66%',
                top: 0,
                bottom: 0,
                width: '1px',
                background: 'rgba(255, 255, 255, 0.4)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '33.33%',
                left: 0,
                right: 0,
                height: '1px',
                background: 'rgba(255, 255, 255, 0.4)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '66.66%',
                left: 0,
                right: 0,
                height: '1px',
                background: 'rgba(255, 255, 255, 0.4)',
              }}
            />

            {/* Corner Handles (White Squares like Meta) */}
            {/* Top-Left */}
            <div
              onMouseDown={(e) => handleMouseDown(e, 'nw')}
              onTouchStart={(e) => handleMouseDown(e, 'nw')}
              style={{
                position: 'absolute',
                top: '-7px',
                left: '-7px',
                width: '14px',
                height: '14px',
                background: '#ffffff',
                border: '1px solid #1e293b',
                cursor: 'nwse-resize',
                pointerEvents: 'auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            />
            {/* Top-Right */}
            <div
              onMouseDown={(e) => handleMouseDown(e, 'ne')}
              onTouchStart={(e) => handleMouseDown(e, 'ne')}
              style={{
                position: 'absolute',
                top: '-7px',
                right: '-7px',
                width: '14px',
                height: '14px',
                background: '#ffffff',
                border: '1px solid #1e293b',
                cursor: 'nesw-resize',
                pointerEvents: 'auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            />
            {/* Bottom-Left */}
            <div
              onMouseDown={(e) => handleMouseDown(e, 'sw')}
              onTouchStart={(e) => handleMouseDown(e, 'sw')}
              style={{
                position: 'absolute',
                bottom: '-7px',
                left: '-7px',
                width: '14px',
                height: '14px',
                background: '#ffffff',
                border: '1px solid #1e293b',
                cursor: 'nesw-resize',
                pointerEvents: 'auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            />
            {/* Bottom-Right */}
            <div
              onMouseDown={(e) => handleMouseDown(e, 'se')}
              onTouchStart={(e) => handleMouseDown(e, 'se')}
              style={{
                position: 'absolute',
                bottom: '-7px',
                right: '-7px',
                width: '14px',
                height: '14px',
                background: '#ffffff',
                border: '1px solid #1e293b',
                cursor: 'nwse-resize',
                pointerEvents: 'auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            />
          </div>
        </div>

        {/* Controls Bar: Zoom Slider + Rotate + Aspect Ratio Presets */}
        <div
          style={{
            padding: '12px 20px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Zoom Slider Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', minWidth: '45px' }}>
              ज़ूम (Zoom):
            </span>
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.15)}
              style={{
                background: '#e2e8f0',
                border: 'none',
                borderRadius: '6px',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
              }}
              title="Zoom Out"
            >
              <ZoomOut size={16} color="#334155" />
            </button>
            <input
              type="range"
              min="1"
              max="3.5"
              step="0.05"
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              style={{
                flex: 1,
                cursor: 'pointer',
                accentColor: '#0064e0',
              }}
            />
            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.15)}
              style={{
                background: '#e2e8f0',
                border: 'none',
                borderRadius: '6px',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
              }}
              title="Zoom In"
            >
              <ZoomIn size={16} color="#334155" />
            </button>
            <span style={{ fontSize: '11px', color: '#64748b', minWidth: '35px', textAlign: 'right' }}>
              {Math.round(zoom * 100)}%
            </span>

            {/* Rotate Button */}
            <button
              type="button"
              onClick={handleRotate}
              style={{
                background: '#e2e8f0',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#334155',
                marginLeft: '8px',
              }}
              title="Rotate 90 degrees"
            >
              <RotateCw size={14} />
              <span>90°</span>
            </button>
          </div>

          {/* Aspect Ratio Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginRight: '4px' }}>
              आकार (Ratio):
            </span>
            <button
              type="button"
              onClick={() => handleSetAspectRatio(1)}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                background: aspectRatio === 1 ? '#eff6ff' : '#ffffff',
                borderColor: aspectRatio === 1 ? '#0064e0' : '#cbd5e1',
                color: aspectRatio === 1 ? '#0064e0' : '#475569',
              }}
            >
              1:1 (Square / फोटो)
            </button>
            <button
              type="button"
              onClick={() => handleSetAspectRatio(4 / 3)}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                background: Math.abs(aspectRatio - 4 / 3) < 0.05 ? '#eff6ff' : '#ffffff',
                borderColor: Math.abs(aspectRatio - 4 / 3) < 0.05 ? '#0064e0' : '#cbd5e1',
                color: Math.abs(aspectRatio - 4 / 3) < 0.05 ? '#0064e0' : '#475569',
              }}
            >
              4:3
            </button>
            <button
              type="button"
              onClick={() => handleSetAspectRatio(0)}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                background: aspectRatio === 0 ? '#eff6ff' : '#ffffff',
                borderColor: aspectRatio === 0 ? '#0064e0' : '#cbd5e1',
                color: aspectRatio === 0 ? '#0064e0' : '#475569',
              }}
            >
              <Maximize2 size={11} style={{ display: 'inline', marginRight: '3px' }} />
              फ्री (Free)
            </button>
          </div>
        </div>

        {/* Footer Actions (Meta Style) */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            background: '#ffffff',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCropAndUpload}
            style={{
              padding: '8px 22px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              background: '#0064e0', // Meta blue
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0, 100, 224, 0.25)',
            }}
          >
            <Check size={16} />
            <span>Upload</span>
          </button>
        </div>
      </div>
    </div>
  );
};
