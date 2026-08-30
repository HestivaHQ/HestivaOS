'use client';

import { useEffect, useState } from 'react';

type PreviewState = { url: string; name: string } | null;

export function PhotoSelectionPreview() {
  const [preview, setPreview] = useState<PreviewState>(null);

  useEffect(() => {
    let activeUrl: string | null = null;

    const handleChange = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
      const file = input.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;

      if (activeUrl) URL.revokeObjectURL(activeUrl);
      activeUrl = URL.createObjectURL(file);
      setPreview({ url: activeUrl, name: file.name || 'Selected job photo' });
    };

    document.addEventListener('change', handleChange, true);
    return () => {
      document.removeEventListener('change', handleChange, true);
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, []);

  if (!preview) return null;

  return (
    <aside className="technicianPhotoPreview" aria-live="polite">
      <div>
        <strong>Photo preview</strong>
        <span>Check the photo before continuing.</span>
      </div>
      <img src={preview.url} alt="Preview of the selected job photo" />
      <button type="button" onClick={() => setPreview(null)} aria-label="Close photo preview">Close</button>
    </aside>
  );
}
