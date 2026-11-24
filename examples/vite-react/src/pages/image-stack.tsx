import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type Ref,
  type CSSProperties,
} from 'react';
import type { VerseImage } from '@youversion/platform-react-ui';
import { ImageArt } from './image-art';

type CardFlight = { image: VerseImage; direction: number; startX: number };
type CardStyle = CSSProperties & {
  '--flight-direction': number;
  '--flight-start-x': string;
  '--flight-start-angle': string;
  '--flight-end-angle': string;
  '--flight-end-scale': number;
  '--flight-end-opacity': number;
};

export function ImageStack({
  images,
  selected,
  onSelect,
  onOpen,
  viewerButtonRef,
}: {
  images: readonly VerseImage[];
  selected: VerseImage;
  onSelect: (image: VerseImage) => void;
  onOpen: () => void;
  viewerButtonRef: Ref<HTMLButtonElement>;
}) {
  const [flight, setFlight] = useState<CardFlight | null>(null);
  const [offset, setOffset] = useState(0);
  const gesture = useRef<{ pointerId: number; x: number; y: number; canShuffle: boolean } | null>(
    null,
  );
  const suppressClick = useRef(false);
  // A shorter response can replace a card while it owns a gesture or an outgoing flight.
  useLayoutEffect(() => {
    if (gesture.current) suppressClick.current = true;
    gesture.current = null;
    setOffset(0);
    setFlight((current) => (current?.image.id === selected.id ? null : current));
  }, [selected.id]);
  const index = Math.max(
    0,
    images.findIndex((image) => image.id === selected.id),
  );

  // Retain the loaded outgoing artwork until its animation finishes, even if a retry removes it.
  const cards =
    flight && !images.some((image) => image.id === flight.image.id)
      ? [...images, flight.image]
      : images;

  function shuffle(direction = -1, startX = 0) {
    if (images.length < 2 || flight) return;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFlight({ image: selected, direction, startX });
    }
    setOffset(0);
    onSelect(images[(index + 1) % images.length]);
  }
  function finishDrag(event: PointerEvent<HTMLButtonElement>) {
    const start = gesture.current;
    if (!start || start.pointerId !== event.pointerId) return;
    gesture.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    suppressClick.current = Math.abs(dx) > 8 || Math.abs(dy) > 8;
    if (
      start.canShuffle &&
      Math.abs(dx) > Math.max(40, event.currentTarget.clientWidth * 0.2) &&
      Math.abs(dx) > Math.abs(dy)
    )
      shuffle(Math.sign(dx), dx);
    setOffset(0);
  }
  return (
    <>
      <div className="image-stack">
        {cards.map((image, imageIndex) => {
          const depth =
            imageIndex < images.length ? (imageIndex - index + images.length) % images.length : 3;
          const isSelected = depth === 0;
          const isFlying = flight?.image.id === image.id;
          if (depth >= 3 && !isFlying) return null;
          const style: CardStyle = {
            zIndex: isFlying ? 4 : 3 - depth,
            transform: isSelected
              ? `translateX(${offset}px) rotate(${offset / 24}deg)`
              : depth === 1
                ? 'rotate(4deg) scale(.98)'
                : 'rotate(-5deg) scale(.96)',
            '--flight-direction': flight?.direction ?? -1,
            '--flight-start-x': `${flight?.startX ?? 0}px`,
            '--flight-start-angle': `${(flight?.startX ?? 0) / 24}deg`,
            '--flight-end-angle': depth === 1 ? '4deg' : '-5deg',
            '--flight-end-scale': depth === 1 ? 0.98 : 0.96,
            '--flight-end-opacity': depth < 3 ? 1 : 0,
          };
          return (
            <div
              key={image.id}
              className={`image-stack-card ${isSelected ? 'image-stack-selected' : 'image-stack-back'}${isFlying ? ' image-stack-flight' : ''}`}
              style={style}
              aria-hidden={!isSelected || undefined}
              onAnimationEnd={isFlying ? () => setFlight(null) : undefined}
            >
              <ImageArt image={image} decorative={!isSelected} />
              {isSelected ? (
                <button
                  ref={viewerButtonRef}
                  type="button"
                  className="image-open"
                  aria-label="View full-screen image"
                  onPointerDown={(event) => {
                    if (!event.isPrimary || event.button !== 0) return;
                    gesture.current = {
                      pointerId: event.pointerId,
                      canShuffle: !flight,
                      x: event.clientX,
                      y: event.clientY,
                    };
                    suppressClick.current = false;
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    const start = gesture.current;
                    if (!start || start.pointerId !== event.pointerId) return;
                    const dx = event.clientX - start.x;
                    const dy = event.clientY - start.y;
                    if (
                      start.canShuffle &&
                      !flight &&
                      Math.abs(dx) > Math.abs(dy) &&
                      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
                    )
                      setOffset(dx);
                  }}
                  onPointerUp={finishDrag}
                  onPointerCancel={(event) => {
                    if (gesture.current?.pointerId !== event.pointerId) return;
                    gesture.current = null;
                    setOffset(0);
                    suppressClick.current = true;
                  }}
                  onClick={(event) => {
                    if (event.detail === 0 || !suppressClick.current) onOpen();
                    suppressClick.current = false;
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="image-position" role="status">
        {index + 1} of {images.length}
      </p>
      {images.length > 1 ? (
        <div className="image-actions" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="image-button"
            aria-disabled={flight !== null}
            onClick={() => shuffle()}
          >
            Next image
          </button>
        </div>
      ) : null}
    </>
  );
}
