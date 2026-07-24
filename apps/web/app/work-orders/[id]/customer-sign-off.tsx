'use client';

import { PointerEvent, useEffect, useRef, useState } from 'react';
import { api, WorkOrderCustomerSignOff, WorkOrderStatus } from '../../../lib/api';

export function CustomerSignOff({ workOrderId, status }: { workOrderId: string; status: WorkOrderStatus }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [signOff, setSignOff] = useState<WorkOrderCustomerSignOff | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { void api.workOrderCustomerSignOff(workOrderId).then(setSignOff).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load sign-off.')); }, [workOrderId]);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = event.currentTarget.getContext('2d');
    const p = point(event);
    context?.beginPath(); context?.moveTo(p.x, p.y);
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext('2d');
    const p = point(event);
    if (context) { context.lineWidth = 3; context.lineCap = 'round'; context.strokeStyle = '#111'; context.lineTo(p.x, p.y); context.stroke(); }
    setHasSignature(true);
  }

  function stop() { drawing.current = false; }
  function clear() { const canvas = canvasRef.current; if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height); setHasSignature(false); }

  async function submit() {
    const canvas = canvasRef.current;
    if (!customerName.trim()) { setError('Customer name is required.'); return; }
    if (!hasSignature || !canvas) { setError('Customer signature is required.'); return; }
    if (!accepted) { setError('Customer acceptance must be confirmed.'); return; }
    setSaving(true); setError('');
    try {
      const created = await api.createWorkOrderCustomerSignOff(workOrderId, { customerName, note, signatureDataUrl: canvas.toDataURL('image/png') });
      setSignOff(created);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save sign-off.'); }
    finally { setSaving(false); }
  }

  if (signOff) return <section className="panel"><div className="panelHeader"><h3>Customer sign-off</h3><span className="statusPill">SIGNED</span></div><p><strong>{signOff.customerName}</strong><br />Accepted {new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(signOff.acceptedAt))}</p><img src={signOff.signatureDataUrl} alt="Customer signature" style={{ width: '100%', maxWidth: 420, height: 140, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 8 }} />{signOff.note ? <p>{signOff.note}</p> : null}</section>;

  const eligible = status === 'COMPLETED' || status === 'CLOSED';
  return <section className="panel resourceForm"><div className="panelHeader"><h3>Customer sign-off</h3></div>{error ? <p className="errorBanner">{error}</p> : null}{eligible ? <><p>I confirm that the listed cleaning work has been completed and presented for acceptance.</p><label>Customer name<input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></label><label>Optional note<textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label><label>Signature<canvas ref={canvasRef} width={700} height={220} onPointerDown={start} onPointerMove={draw} onPointerUp={stop} onPointerCancel={stop} style={{ width: '100%', height: 160, touchAction: 'none', border: '1px solid #bbb', borderRadius: 8, background: '#fff' }} /></label><button type="button" onClick={clear}>Clear signature</button><label><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /> Customer accepts the completed work</label><button className="primaryButton" type="button" disabled={saving} onClick={() => void submit()}>{saving ? 'Saving…' : 'Save customer sign-off'}</button></> : <p>Sign-off becomes available after the work order is completed.</p>}</section>;
}
