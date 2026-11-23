import { useEffect, useRef, useState, type FormEvent } from 'react';
import { clampSearchText, type VerseImage } from '@youversion/platform-react-ui';
import {
  createImageLibraryClients,
  imageError,
  type ImageLibraryClients,
  type ReadImagePassage,
} from './image-library-api';
import { ImageLanguagePicker } from './image-language-picker';
import { ImageDetail } from './image-detail';
import { ImageArt } from './image-art';
import { useImageResults } from './use-image-results';
import { formatHash } from '../routes';
import './image-library.css';

export function ImagesPage({
  imageId,
  onSelectImage,
  active = true,
  onReadInBible,
}: {
  imageId: string | null;
  onSelectImage: (id: string | null) => void;
  active?: boolean;
  onReadInBible?: ReadImagePassage;
}) {
  const [clients] = useState(createImageLibraryClients);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [validation, setValidation] = useState<string | null>(null);
  const [language, setLanguage] = useState('en');
  function submit(event: FormEvent) {
    event.preventDefault();
    const value = draft.trim();
    if (clampSearchText(value) !== value) {
      setValidation('Enter a search of 100 characters or fewer.');
      return;
    }
    setValidation(null);
    onSelectImage(null);
    setQuery(value);
  }
  return (
    <div className="image-library">
      <header>
        <div>
          <p className="image-eyebrow">Content library</p>
          <h1>Verse images</h1>
        </div>
        <ImageLanguagePicker
          language={language}
          active={active}
          onChange={(tag) => {
            onSelectImage(null);
            setLanguage(tag);
          }}
        />
      </header>
      <form role="search" className="image-toolbar" onSubmit={submit}>
        <input
          type="search"
          aria-label="Search images"
          placeholder="Search by verse or text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        {draft || query ? (
          <button
            className="image-button"
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onSelectImage(null);
              setDraft('');
              setQuery('');
              setValidation(null);
            }}
          >
            Clear
          </button>
        ) : null}
        <button className="image-button image-primary" type="submit">
          Search
        </button>
      </form>
      {validation ? (
        <p role="alert" className="image-status">
          {validation}
        </p>
      ) : null}
      <ImageResults
        key={`${language}:${query}`}
        imageId={imageId}
        onSelectImage={onSelectImage}
        active={active}
        clients={clients}
        language={language}
        query={query}
        onReadInBible={onReadInBible}
      />
    </div>
  );
}

function ImageResults({
  clients,
  language,
  query,
  imageId,
  onSelectImage,
  active,
  onReadInBible,
}: {
  clients: ImageLibraryClients;
  language: string;
  query: string;
  imageId: string | null;
  onSelectImage: (id: string | null) => void;
  active: boolean;
  onReadInBible?: ReadImagePassage;
}) {
  const { images, loading, error, hasMore, load } = useImageResults(
    clients,
    language,
    query,
    active,
  );
  const container = useRef<HTMLDivElement>(null);
  const listScroll = useRef(0);
  const openedCard = useRef<HTMLAnchorElement | null>(null);
  const detail = useRef<HTMLDivElement>(null);
  const previousImageId = useRef(imageId);
  useEffect(() => {
    if (!active || imageId !== null) return;
    const owner = container.current?.closest('[data-demo-scroll]') ?? document.scrollingElement;
    const target = owner === document.scrollingElement ? document : owner;
    const remember = () => {
      listScroll.current = owner?.scrollTop ?? 0;
    };
    target?.addEventListener('scroll', remember);
    return () => target?.removeEventListener('scroll', remember);
  }, [imageId, active]);
  useEffect(() => {
    const entering = previousImageId.current !== imageId && imageId !== null;
    const returning = previousImageId.current !== null && imageId === null;
    previousImageId.current = imageId;
    if ((!entering && !returning) || !active) return;
    const frame = requestAnimationFrame(() => {
      if (returning) (openedCard.current ?? container.current)?.focus({ preventScroll: true });
      else {
        if (
          openedCard.current?.getAttribute('href') !==
          formatHash({ destination: 'content', imageId })
        )
          openedCard.current = null;
        detail.current?.focus({ preventScroll: true });
      }
      const owner = container.current?.closest('[data-demo-scroll]') ?? document.scrollingElement;
      owner?.scrollTo({ top: returning ? listScroll.current : 0 });
    });
    return () => cancelAnimationFrame(frame);
  }, [imageId, active]);
  return (
    <div ref={container} tabIndex={-1}>
      {imageId !== null ? (
        <div ref={detail} role="region" aria-label="Image detail" tabIndex={-1}>
          <RoutedImageDetail
            key={imageId}
            imageId={imageId}
            cached={images.find((image) => image.id === imageId)}
            clients={clients}
            language={language}
            active={active}
            onBack={() => onSelectImage(null)}
            onReadInBible={onReadInBible}
          />
        </div>
      ) : null}
      <div hidden={imageId !== null}>
        {error ? (
          <div className="image-error">
            <p role="alert">{error}</p>
            <button
              type="button"
              className="image-button"
              disabled={loading}
              onClick={() => void load()}
            >
              Retry
            </button>
          </div>
        ) : null}
        <ul className="image-grid" aria-label="Verse images">
          {images.map((image) => (
            <li key={image.id}>
              <ImageArt image={image} size="thumb" />
              <span className="image-reference" dir="auto">
                {image.passage_id}
              </span>
              <a
                className="image-open"
                href={formatHash({ destination: 'content', imageId: image.id })}
                aria-label={`Open ${image.passage_id}`}
                onClick={(event) => {
                  if (
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                  )
                    return;
                  event.preventDefault();
                  openedCard.current = event.currentTarget;
                  const owner =
                    container.current?.closest('[data-demo-scroll]') ?? document.scrollingElement;
                  listScroll.current = owner?.scrollTop ?? 0;
                  onSelectImage(image.id);
                }}
              />
            </li>
          ))}
        </ul>
        {loading ? (
          <p className="image-status" role="status">
            Loading images…
          </p>
        ) : null}
        {!loading && !error && images.length === 0 ? (
          <p role="status" aria-label="Empty image results" className="image-status">
            No images found{query ? ` for “${query}”` : ''}.
          </p>
        ) : null}
        {hasMore && !error ? (
          <div className="image-actions">
            <button
              className="image-button"
              disabled={loading}
              type="button"
              onClick={() => void load()}
            >
              Load more
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RoutedImageDetail({
  imageId,
  cached,
  clients,
  language,
  active,
  onBack,
  onReadInBible,
}: {
  imageId: string;
  cached?: VerseImage;
  clients: ImageLibraryClients;
  language: string;
  active: boolean;
  onBack: () => void;
  onReadInBible?: ReadImagePassage;
}) {
  const [image, setImage] = useState<VerseImage | null>(cached ?? null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!active || image) return;
    if (cached) {
      setImage(cached);
      return;
    }
    let current = true;
    setError(null);
    void clients.images.getImage(imageId).then(
      (result) => {
        if (current) setImage(result);
      },
      (cause) => {
        if (current)
          setError(imageError(cause instanceof Error ? cause : new Error('Unable to load image.')));
      },
    );
    return () => {
      current = false;
    };
  }, [active, cached, clients, imageId, image, retry]);
  if (image)
    return (
      <ImageDetail
        image={image}
        language={language}
        clients={clients}
        active={active}
        onBack={onBack}
        onReadInBible={onReadInBible}
      />
    );
  return (
    <section>
      <button type="button" className="image-button" onClick={onBack}>
        Back to images
      </button>
      {error ? (
        <div className="image-error">
          <p role="alert">{error}</p>
          <button
            type="button"
            className="image-button"
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry image details
          </button>
        </div>
      ) : (
        <p role="status" className="image-status">
          Loading image details…
        </p>
      )}
    </section>
  );
}
