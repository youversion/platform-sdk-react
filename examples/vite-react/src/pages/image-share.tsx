import { ImageLibraryButton as Button } from './image-library-button';
import { useState } from 'react';
import type { VerseImage } from '@youversion/platform-react-ui';
import { imageError } from './image-library-api';

export function ImageShare({ image }: { image: VerseImage }) {
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState(false);
  const supportsSharing = Boolean('share' in navigator);
  async function share() {
    setError(null);
    setBusy(true);
    try {
      await navigator.share({ title: image.passage_id, url: image.image_url });
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
        setFallback(true);
        setError(imageError(cause instanceof Error ? cause : new Error('Unable to share image.')));
      }
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    setError(null);
    try {
      await navigator.clipboard.writeText(image.image_url);
      setCopied(true);
    } catch {
      setError('Unable to copy. Use the image link instead.');
    }
  }
  return (
    <div className="image-share max-[30rem]:col-span-full">
      {supportsSharing ? (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void share()}
          aria-label="Share image"
        >
          Share
        </Button>
      ) : null}
      {!supportsSharing || fallback ? (
        <div className="my-4 flex flex-wrap items-center gap-3 max-[30rem]:in-[[role=dialog]]:my-0">
          <Button asChild variant="outline">
            <a href={image.image_url} target="_blank" rel="noreferrer">
              Open image link
            </a>
          </Button>
          {navigator.clipboard ? (
            <Button type="button" variant="outline" onClick={() => void copy()}>
              {copied ? 'Copied' : 'Copy image link'}
            </Button>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="py-4 text-muted-foreground">
          {error}
        </p>
      ) : null}
    </div>
  );
}
