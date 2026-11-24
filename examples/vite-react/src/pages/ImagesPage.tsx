import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
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
  scrollContainerRef,
  imageId,
  onSelectImage,
  active = true,
  onReadInBible,
}: {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
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
    <div className="image-library mx-auto max-w-[68rem] p-[clamp(1.25rem,4vw,3rem)] motion-reduce:[&_*]:scroll-auto">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-[0.8rem] text-muted-foreground">Content library</p>
          <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold tracking-[-0.035em]">
            Verse images
          </h1>
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
      <form
        role="search"
        className="mb-6 flex items-center gap-2 rounded-[2rem] bg-muted p-2"
        onSubmit={submit}
      >
        <input
          className="min-w-0 flex-1 rounded-[2rem] bg-transparent px-3 py-2 outline-offset-3 focus-visible:outline-2 focus-visible:outline-foreground"
          type="search"
          aria-label="Search images"
          placeholder="Search by verse or text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        {draft || query ? (
          <Button
            variant="outline"
            className="h-auto min-h-11 rounded-full font-normal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground focus-visible:ring-0 aria-disabled:cursor-default aria-disabled:opacity-50"
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
          </Button>
        ) : null}
        <Button
          className="h-auto min-h-11 rounded-full font-normal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground focus-visible:ring-0 aria-disabled:cursor-default aria-disabled:opacity-50"
          type="submit"
        >
          Search
        </Button>
      </form>
      {validation ? (
        <p role="alert" className="py-4 text-muted-foreground">
          {validation}
        </p>
      ) : null}
      <ImageResults
        scrollContainerRef={scrollContainerRef}
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
  scrollContainerRef,
  clients,
  language,
  query,
  imageId,
  onSelectImage,
  active,
  onReadInBible,
}: {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
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
    const owner = scrollContainerRef.current;
    const remember = () => {
      listScroll.current = owner?.scrollTop ?? 0;
    };
    owner?.addEventListener('scroll', remember);
    return () => owner?.removeEventListener('scroll', remember);
  }, [imageId, active, scrollContainerRef]);
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
      const owner = scrollContainerRef.current;
      owner?.scrollTo({ top: returning ? listScroll.current : 0 });
    });
    return () => cancelAnimationFrame(frame);
  }, [imageId, active, scrollContainerRef]);
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
          <div className="my-4 border-s-[3px] border-destructive ps-4">
            <p role="alert">{error}</p>
            <Button
              type="button"
              variant="outline"
              className="h-auto min-h-11 rounded-full font-normal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground focus-visible:ring-0 aria-disabled:cursor-default aria-disabled:opacity-50"
              disabled={loading}
              onClick={() => void load()}
            >
              Retry
            </Button>
          </div>
        ) : null}
        <ul
          className="image-grid grid list-none grid-cols-2 gap-x-4 gap-y-6 p-0 md:gap-7 md:grid-cols-3"
          aria-label="Verse images"
        >
          {images.map((image) => (
            <li className="relative min-w-0" key={image.id}>
              <ImageArt image={image} size="thumb" />
              <span className="mt-[0.65rem] block text-[0.85rem] font-semibold" dir="auto">
                {image.passage_id}
              </span>
              <a
                className="image-open absolute inset-0 cursor-pointer rounded-[1.125rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
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
                  const owner = scrollContainerRef.current;
                  listScroll.current = owner?.scrollTop ?? 0;
                  onSelectImage(image.id);
                }}
              />
            </li>
          ))}
        </ul>
        {loading ? (
          <p className="py-4 text-muted-foreground" role="status">
            Loading images…
          </p>
        ) : null}
        {!loading && !error && images.length === 0 ? (
          <p role="status" aria-label="Empty image results" className="py-4 text-muted-foreground">
            No images found{query ? ` for “${query}”` : ''}.
          </p>
        ) : null}
        {hasMore && !error ? (
          <div className="my-4 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="h-auto min-h-11 rounded-full font-normal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground focus-visible:ring-0 aria-disabled:cursor-default aria-disabled:opacity-50"
              disabled={loading}
              type="button"
              onClick={() => void load()}
            >
              Load more
            </Button>
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
      <Button
        type="button"
        variant="outline"
        className="h-auto min-h-11 rounded-full font-normal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground focus-visible:ring-0 aria-disabled:cursor-default aria-disabled:opacity-50"
        onClick={onBack}
      >
        Back to images
      </Button>
      {error ? (
        <div className="my-4 border-s-[3px] border-destructive ps-4">
          <p role="alert">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-11 rounded-full font-normal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground focus-visible:ring-0 aria-disabled:cursor-default aria-disabled:opacity-50"
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry image details
          </Button>
        </div>
      ) : (
        <p role="status" className="py-4 text-muted-foreground">
          Loading image details…
        </p>
      )}
    </section>
  );
}
