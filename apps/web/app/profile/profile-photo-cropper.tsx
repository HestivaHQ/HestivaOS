'use client';

import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react';

const OUTPUT_SIZE = 512;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Unable to prepare the cropped profile photo.'));
    }, 'image/jpeg', 0.88);
  });
}

export function ProfilePhotoCropper({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void>;
}) {
  const objectUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState(320);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [applying, setApplying] = useState(false);
  const [cropError, setCropError] = useState('');
  const drag = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const updateSize = () => setStageSize(stage.getBoundingClientRect().width || 320);
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const baseScale = naturalSize.width && naturalSize.height
    ? Math.max(stageSize / naturalSize.width, stageSize / naturalSize.height)
    : 1;
  const renderedWidth = naturalSize.width * baseScale * zoom;
  const renderedHeight = naturalSize.height * baseScale * zoom;
  const maxX = Math.max(0, (renderedWidth - stageSize) / 2);
  const maxY = Math.max(0, (renderedHeight - stageSize) / 2);

  function boundedOffset(nextX: number, nextY: number) {
    return { x: clamp(nextX, -maxX, maxX), y: clamp(nextY, -maxY, maxY) };
  }

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y };
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    setOffset(boundedOffset(
      drag.current.offsetX + event.clientX - drag.current.x,
      drag.current.offsetY + event.clientY - drag.current.y,
    ));
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }

  function changeZoom(nextZoom: number) {
    const boundedZoom = clamp(nextZoom, 1, 3);
    const nextRenderedWidth = naturalSize.width * baseScale * boundedZoom;
    const nextRenderedHeight = naturalSize.height * baseScale * boundedZoom;
    const nextMaxX = Math.max(0, (nextRenderedWidth - stageSize) / 2);
    const nextMaxY = Math.max(0, (nextRenderedHeight - stageSize) / 2);
    setZoom(boundedZoom);
    setOffset(({ x, y }) => ({ x: clamp(x, -nextMaxX, nextMaxX), y: clamp(y, -nextMaxY, nextMaxY) }));
  }

  async function applyCrop() {
    if (!naturalSize.width || !naturalSize.height || applying) return;
    setApplying(true);
    setCropError('');
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to prepare the profile photo editor.');
      const outputRatio = OUTPUT_SIZE / stageSize;
      const drawScale = baseScale * zoom * outputRatio;
      const drawWidth = naturalSize.width * drawScale;
      const drawHeight = naturalSize.height * drawScale;
      const drawX = OUTPUT_SIZE / 2 + offset.x * outputRatio - drawWidth / 2;
      const drawY = OUTPUT_SIZE / 2 + offset.y * outputRatio - drawHeight / 2;
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      await onConfirm(await canvasBlob(canvas));
    } catch (error) {
      setCropError(error instanceof Error ? error.message : 'Unable to save the cropped profile photo.');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="profileCropBackdrop" role="dialog" aria-modal="true" aria-labelledby="profile-crop-title">
      <section className="profileCropDialog">
        <div className="profileCropHeader">
          <div>
            <p className="eyebrow">Profile photo</p>
            <h3 id="profile-crop-title">Crop your headshot</h3>
            <p>Drag the photo to position your face, then zoom until the framing looks right.</p>
          </div>
        </div>
        {cropError ? <p className="errorBanner" role="alert">{cropError}</p> : null}
        <div
          ref={stageRef}
          className="profileCropStage"
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <img
            src={objectUrl}
            alt="Profile photo crop preview"
            draggable={false}
            onLoad={(event) => setNaturalSize({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            })}
            style={{
              width: renderedWidth || 'auto',
              height: renderedHeight || 'auto',
              left: `calc(50% + ${offset.x}px)`,
              top: `calc(50% + ${offset.y}px)`,
            }}
          />
          <div className="profileCropGuide" aria-hidden="true" />
        </div>
        <label className="profileCropZoom">
          <span>Zoom</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(event) => changeZoom(Number(event.target.value))}
            disabled={!naturalSize.width || applying}
          />
        </label>
        <div className="profileCropActions">
          <button type="button" onClick={onCancel} disabled={applying}>Cancel</button>
          <button className="primaryButton" type="button" onClick={() => void applyCrop()} disabled={!naturalSize.width || applying}>
            {applying ? 'Saving…' : 'Use this photo'}
          </button>
        </div>
      </section>
    </div>
  );
}
