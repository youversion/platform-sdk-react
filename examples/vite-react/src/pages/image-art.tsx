import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { VerseImage } from '@youversion/platform-react-ui';
import { imageUrl, type ImageRendition } from './image-library-api';

export function ImageArt({
  image,
  size = 'card',
  decorative = false,
}: {
  image: VerseImage;
  size?: ImageRendition;
  decorative?: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  return (
    <div
      className={cn(
        'image-art relative w-full overflow-hidden rounded-[1.125rem] bg-muted',
        size === 'card' && 'h-full',
        size === 'full' &&
          'mx-auto max-h-[75dvh] w-fit max-w-full data-[status=loading]:min-h-48 data-[status=loading]:min-w-[min(100%,20rem)] data-[status=error]:min-h-48 data-[status=error]:min-w-[min(100%,20rem)]',
      )}
      data-status={status}
      style={{
        aspectRatio: size === 'thumb' ? 1 : image.aspect_ratio > 0 ? image.aspect_ratio : 1,
      }}
      aria-hidden={decorative || undefined}
    >
      <img
        className={cn(
          'block h-full w-full object-contain',
          size === 'full' && 'max-h-[75dvh] w-auto max-w-full',
        )}
        key={attempt}
        src={imageUrl(image.image_url, size)}
        alt={decorative ? '' : image.passage_id}
        draggable={false}
        onLoad={() => setStatus('ready')}
        onError={() => setStatus('error')}
        style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }}
      />
      {!decorative && status === 'loading' ? (
        <span
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-[0.85rem]"
          role={size === 'thumb' ? undefined : 'status'}
        >
          Loading artwork…
        </span>
      ) : null}
      {!decorative && status === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-[0.85rem]">
          <span role={size === 'thumb' ? undefined : 'alert'}>Artwork could not load.</span>
          <Button
            type="button"
            variant="outline"
            className="relative z-2 h-auto min-h-11 rounded-full font-normal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground focus-visible:ring-0 aria-disabled:cursor-default aria-disabled:opacity-50"
            aria-label={
              size === 'thumb'
                ? `Retry artwork: ${image.passage_id}, ${image.attribution || image.id}`
                : undefined
            }
            onClick={(event) => {
              event.stopPropagation();
              setStatus('loading');
              setAttempt((value) => value + 1);
            }}
          >
            Retry artwork
          </Button>
        </div>
      ) : null}
    </div>
  );
}
