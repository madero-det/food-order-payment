import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export default function CropModal({ imageSrc, onCrop, onCancel }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [cropSize, setCropSize] = useState(0);

  const CROP_OUTPUT = 400;

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const container = containerRef.current;
      if (!container) return;
      const maxW = Math.min(400, container.clientWidth - 32);
      const scale = maxW / img.width;
      const w = img.width * scale;
      const h = img.height * scale;
      setImgSize({ w, h });
      const crop = Math.min(w, h) * 0.85;
      setCropSize(crop);
      setPos({ x: (w - crop) / 2, y: (h - crop) / 2 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragging(true);
    setOffset({ x: clientX - rect.left - pos.x, y: clientY - rect.top - pos.y });
  }, [pos]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let x = clientX - rect.left - offset.x;
    let y = clientY - rect.top - offset.y;
    x = Math.max(0, Math.min(x, imgSize.w - cropSize));
    y = Math.max(0, Math.min(y, imgSize.h - cropSize));
    setPos({ x, y });
  }, [dragging, offset, imgSize, cropSize]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleCrop = () => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = CROP_OUTPUT;
    canvas.height = CROP_OUTPUT;
    const scale = img.width / imgSize.w;
    const sx = pos.x * scale;
    const sy = pos.y * scale;
    const sc = cropSize * scale;
    ctx.drawImage(img, sx, sy, sc, sc, 0, 0, CROP_OUTPUT, CROP_OUTPUT);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg', lastModified: Date.now() });
        onCrop(file);
      }
    }, 'image/jpeg', 0.92);
  };

  return createPortal(
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal crop-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Crop Profile Picture</h3>
        <div className="crop-container" ref={containerRef}>
          <div
            className="crop-viewport"
            style={{ width: cropSize, height: cropSize }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            {imgSize.w > 0 && (
              <img
                src={imageSrc}
                alt="Crop"
                draggable={false}
                style={{
                  width: imgSize.w,
                  height: imgSize.h,
                  position: 'absolute',
                  left: -pos.x,
                  top: -pos.y,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            )}
          </div>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCrop}>Upload</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
