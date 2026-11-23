import { useState } from 'react';
import type { VerseImage } from '@youversion/platform-react-ui';
import { imageUrl } from './image-library-api';

export function ImageArt({
  image,
  size = 'card',
  decorative = false,
}: {
  image: VerseImage;
  size?: 'thumb' | 'card' | 'full';
  decorative?: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  return (
    <div
      className="image-art"
      style={{ aspectRatio: image.aspect_ratio > 0 ? image.aspect_ratio : 1 }}
      aria-hidden={decorative || undefined}
    >
      <img
        key={attempt}
        src={imageUrl(image.image_url, size)}
        alt={decorative ? '' : image.passage_id}
        draggable={false}
        onLoad={() => setStatus('ready')}
        onError={() => setStatus('error')}
        style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }}
      />
      {!decorative && status === 'loading' ? (
        <span className="image-art-message" role="status">
          Loading artwork…
        </span>
      ) : null}
      {!decorative && status === 'error' ? (
        <div className="image-art-message">
          <span role="alert">Artwork could not load.</span>
          <button
            type="button"
            className="image-button"
            onClick={(event) => {
              event.stopPropagation();
              setStatus('loading');
              setAttempt((value) => value + 1);
            }}
          >
            Retry artwork
          </button>
        </div>
      ) : null}
    </div>
  );
}
