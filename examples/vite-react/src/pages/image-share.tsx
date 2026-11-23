import { useState } from 'react';
import type { VerseImage } from '@youversion/platform-react-ui';
import { imageError } from './image-library-api';

export function ImageShare({ image }: { image: VerseImage }) {
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const supportsSharing = Boolean('share' in navigator);
  async function share() {
    setError(null);
    setBusy(true);
    try {
      await navigator.share({ title: image.passage_id, url: image.image_url });
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError'))
        setError(imageError(cause instanceof Error ? cause : new Error('Unable to load content.')));
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
    <div className="image-share">
      {supportsSharing ? (
        <button
          type="button"
          className="image-button"
          disabled={busy}
          onClick={() => void share()}
          aria-label="Share image"
        >
          Share
        </button>
      ) : (
        <div className="image-actions">
          <a className="image-button" href={image.image_url} target="_blank" rel="noreferrer">
            Open image link
          </a>
          {navigator.clipboard ? (
            <button type="button" className="image-button" onClick={() => void copy()}>
              {copied ? 'Copied' : 'Copy image link'}
            </button>
          ) : null}
        </div>
      )}
      {error ? (
        <p role="alert" className="image-status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
