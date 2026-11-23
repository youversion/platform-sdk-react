import { useRef, useState, type PointerEvent, type Ref, type CSSProperties } from 'react';
import type { VerseImage } from '@youversion/platform-react-ui';
import { ImageArt } from './image-art';

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
  const [flight, setFlight] = useState<{ image: VerseImage; direction: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const index = Math.max(
    0,
    images.findIndex((image) => image.id === selected.id),
  );
  const back = [1, 2]
    .filter((depth) => depth < images.length)
    .map((depth) => images[(index + depth) % images.length]);

  function shuffle(direction = -1) {
    if (images.length < 2 || flight) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) setFlight({ image: selected, direction });
    setOffset(0);
    onSelect(images[(index + 1) % images.length]);
  }
  function finishDrag(event: PointerEvent<HTMLButtonElement>) {
    const start = gesture.current;
    gesture.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    suppressClick.current = Math.abs(dx) > 8 || Math.abs(dy) > 8;
    if (
      Math.abs(dx) > Math.max(40, event.currentTarget.clientWidth * 0.2) &&
      Math.abs(dx) > Math.abs(dy)
    )
      shuffle(Math.sign(dx));
    setOffset(0);
  }
  const flightStyle: CSSProperties & { '--flight-direction': number } = {
    '--flight-direction': flight?.direction ?? -1,
  };
  return (
    <>
      <div className="image-stack">
        {back.reverse().map((image) => (
          <div key={image.id} className="image-stack-card image-stack-back" aria-hidden="true">
            <ImageArt image={image} decorative />
          </div>
        ))}
        <div
          className="image-stack-card image-stack-selected"
          style={{ transform: `translateX(${offset}px) rotate(${offset / 24}deg)` }}
        >
          <ImageArt key={selected.id} image={selected} />
          <button
            ref={viewerButtonRef}
            type="button"
            className="image-open"
            aria-label="View full-screen image"
            onPointerDown={(event) => {
              if (!event.isPrimary || event.button !== 0 || flight) return;
              gesture.current = { x: event.clientX, y: event.clientY };
              suppressClick.current = false;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const start = gesture.current;
              if (!start) return;
              const dx = event.clientX - start.x;
              const dy = event.clientY - start.y;
              if (
                Math.abs(dx) > Math.abs(dy) &&
                !window.matchMedia('(prefers-reduced-motion: reduce)').matches
              )
                setOffset(dx);
            }}
            onPointerUp={finishDrag}
            onPointerCancel={() => {
              gesture.current = null;
              setOffset(0);
              suppressClick.current = true;
            }}
            onClick={(event) => {
              if (event.detail === 0 || !suppressClick.current) onOpen();
              suppressClick.current = false;
            }}
          />
        </div>
        {flight ? (
          <div
            className="image-stack-card image-stack-flight"
            style={flightStyle}
            aria-hidden="true"
            onAnimationEnd={() => setFlight(null)}
          >
            <ImageArt image={flight.image} decorative />
          </div>
        ) : null}
      </div>
      <p className="image-position" role="status">
        {index + 1} of {images.length}
      </p>
      {images.length > 1 ? (
        <div className="image-actions" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="image-button"
            disabled={flight !== null}
            onClick={() => shuffle()}
          >
            Next image
          </button>
        </div>
      ) : null}
    </>
  );
}
