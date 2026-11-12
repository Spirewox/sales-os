'use client';

import { useEffect, useId, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { axiosPost } from '@/lib/api';

export type ImageDraft = { file: File } | { url: string | null };
const maxBytes = 10_000_000;
const types = ['image/jpeg', 'image/png', 'image/webp'];

export async function productImagePayload(
  draft: ImageDraft | undefined,
  target: { hubId?: string; productId?: string },
  onProgress: (value: number) => void,
) {
  if (!draft) return {};
  if ('url' in draft) return { image_url: draft.url };
  const file = draft.file;
  const path = target.productId
    ? 'inventory/' + encodeURIComponent(target.productId) + '/product-image-uploads'
    : 'inventory/product-image-uploads';
  const form = await axiosPost(path, { hubId: target.hubId, type: file.type, size: file.size }, true) as {
    url: string;
    fields: Record<string, string>;
    token: string;
  };
  const body = new FormData();
  for (const [name, value] of Object.entries(form.fields)) body.append(name, value);
  body.append('file', file);
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', form.url);
    xhr.timeout = 120_000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300
      ? resolve() : reject(new Error('Image upload failed. Try saving again.'));
    xhr.onerror = xhr.ontimeout = () => reject(new Error('Image upload interrupted. Try saving again.'));
    xhr.send(body);
  });
  return { image_upload_token: form.token };
}

export function SkuPhoto({ url, className }: { url?: string; className?: string }) {
  return <Photo key={url} url={url} className={className} />;
}

function Photo({ url, className }: { url?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={'inline-grid shrink-0 place-items-center overflow-hidden rounded-md bg-muted ' + (className ?? '')}>
      {url && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : <ImageIcon aria-hidden size={18} className="text-muted-foreground" />}
    </span>
  );
}

export function ProductImageEditor({ saved, draft, onChange }: {
  saved?: string;
  draft?: ImageDraft;
  onChange: (draft?: ImageDraft) => void;
}) {
  const id = useId();
  const [link, setLink] = useState('');
  const [showLink, setShowLink] = useState(false);
  const [error, setError] = useState('');
  const [filePreview, setFilePreview] = useState<string>();
  const file = draft && 'file' in draft ? draft.file : undefined;
  useEffect(() => {
    if (!file) {
      setFilePreview(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const preview = file ? filePreview : draft && 'url' in draft ? draft.url ?? undefined : saved;
  function selectFile(next?: File) {
    if (!next) return;
    if (!types.includes(next.type) || !next.size || next.size > maxBytes) {
      setError('Choose a JPEG, PNG or WebP image up to 10 MB.');
      return;
    }
    setError('');
    setShowLink(false);
    onChange({ file: next });
  }

  return (
    <section className="mb-4 rounded-xl border bg-muted/20 p-3" aria-label="Product image"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); selectFile(event.dataTransfer.files[0]); }}>
      <div className="flex items-center gap-3">
        <SkuPhoto url={preview} className="h-16 w-16" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Product image</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <label htmlFor={id} className="cursor-pointer rounded-md border bg-background px-2 py-1.5 text-xs font-medium focus-within:ring-2">
              {preview ? 'Replace file' : 'Choose file'}
              <input id={id} type="file" accept={types.join(',')} className="sr-only" onChange={(event) => {
                selectFile(event.target.files?.[0]);
                event.target.value = '';
              }} />
            </label>
            <button type="button" className="rounded-md border bg-background px-2 py-1.5 text-xs" onClick={() => setShowLink(!showLink)}>Use image link</button>
            {preview && <button type="button" className="px-2 text-xs text-destructive" onClick={() => { setError(''); onChange({ url: null }); }}>Remove</button>}
            {draft && <button type="button" className="px-2 text-xs" onClick={() => { setError(''); onChange(undefined); }}>Undo</button>}
          </div>
        </div>
      </div>
      {showLink && <div className="mt-3 flex flex-wrap gap-2">
        <input aria-label="Public HTTPS image link" type="url" placeholder="https://…" value={link} onChange={(event) => setLink(event.target.value)} className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1.5 text-sm" />
        <button type="button" className="rounded-md border bg-background px-2 text-xs" onClick={() => {
          const value = link.trim();
          try {
            const url = new URL(value);
            if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
            setError('');
            onChange({ url: value });
          } catch {
            setError('Enter a public HTTPS image link.');
          }
        }}>Preview link</button>
      </div>}
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </section>
  );
}
