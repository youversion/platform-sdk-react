import { ImageLibraryButton as Button } from './image-library-button';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { BibleCard, type BibleVersion, type VerseImage } from '@youversion/platform-react-ui';
import { ImageArt } from './image-art';
import { ImageShare } from './image-share';
import { ImageStack } from './image-stack';
import {
  imageError,
  appendImages,
  resolveImageBible,
  type ImageLibraryClients,
  type ReadImagePassage,
} from './image-library-api';

export function ImageDetail({
  image,
  active = true,
  language,
  clients,
  onBack,
  onReadInBible,
}: {
  image: VerseImage;
  active?: boolean;
  language: string;
  clients: ImageLibraryClients;
  onBack: () => void;
  onReadInBible?: ReadImagePassage;
}) {
  const [images, setImages] = useState<VerseImage[]>([image]);
  const [selectedId, setSelectedId] = useState(image.id);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLElement>(null);
  const complete = useRef(false);
  const viewerButton = useRef<HTMLButtonElement>(null);
  const selected = images.find((item) => item.id === selectedId) ?? images[0] ?? image;

  useEffect(() => {
    if (!active) setOpen(false);
  }, [active]);

  useEffect(() => {
    if (!active || complete.current) return;
    let current = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const visited = new Set<string>();
        let token: string | null = null;
        let collected = [image];
        do {
          const page = await clients.images.getImages({
            passage_id: image.passage_id,
            language_ranges: [language],
            page_size: 99,
            page_token: token,
          });
          if (!current) return;
          collected = appendImages(collected, page.data);
          setImages((previous) => appendImages(previous, page.data));
          token = page.next_page_token;
          if (token !== null && visited.has(token))
            throw new Error('The image service repeated a page. Please retry.');
          if (token !== null) visited.add(token);
        } while (token !== null);
        if (current) {
          complete.current = true;
          setImages(collected);
        }
      } catch (cause) {
        if (current)
          setError(
            imageError(cause instanceof Error ? cause : new Error('Unable to load content.')),
          );
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => {
      current = false;
    };
  }, [clients, image, language, retry, active]);

  return (
    <section ref={container} role="region" aria-label="Passage artwork" tabIndex={-1}>
      <div className="my-4 flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          Back to images
        </Button>
        <ImageShare key={selected.id} image={selected} />
      </div>
      <p className="mbe-1 text-[0.8rem] text-muted-foreground">Verse images</p>
      <h2 className="text-2xl font-[650]" dir="auto">
        {image.passage_id}
      </h2>
      <ImageStack
        images={images}
        selected={selected}
        onSelect={(item) => setSelectedId(item.id)}
        onOpen={() => setOpen(true)}
        viewerButtonRef={viewerButton}
      />
      {loading ? (
        <p className="py-4 text-muted-foreground" role="status">
          Loading more artwork…
        </p>
      ) : null}
      {error ? (
        <div className="my-4 border-s-[3px] border-destructive ps-4">
          <p role="alert">{error}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              container.current?.focus({ preventScroll: true });
              complete.current = false;
              setRetry((value) => value + 1);
            }}
          >
            Retry artwork list
          </Button>
        </div>
      ) : null}
      <Dialog.Root open={active && open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-60 bg-black/60" />
          <Dialog.Content
            className="fixed inset-4 z-[61] overflow-y-auto rounded-3xl bg-background p-[clamp(1rem,3vw,2rem)] text-foreground motion-reduce:[&_*]:scroll-auto"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (active) viewerButton.current?.focus();
            }}
          >
            <div className="mx-auto max-w-[40rem]">
              <div className="mbe-6 flex items-center justify-between gap-2 max-[30rem]:grid max-[30rem]:grid-cols-[auto_1fr] max-[30rem]:[&_h2]:text-end">
                <Dialog.Close asChild>
                  <Button type="button" variant="outline">
                    Close image
                  </Button>
                </Dialog.Close>
                <Dialog.Title>Verse image</Dialog.Title>
                <ImageShare key={selected.id} image={selected} />
              </div>
              <Dialog.Description className="mbe-1 text-[0.8rem] text-muted-foreground">
                Artwork and its Bible passage
              </Dialog.Description>
              <ImageArt key={selected.id} image={selected} size="full" />
              <p className="py-4 text-muted-foreground" dir="auto">
                {selected.attribution}
              </p>
              <ImagePassage
                key={`${language}:${selected.passage_id}`}
                image={selected}
                language={language}
                clients={clients}
                onReadInBible={
                  onReadInBible
                    ? (passageId, versionId) => {
                        setOpen(false);
                        onReadInBible(passageId, versionId);
                      }
                    : undefined
                }
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

function ImagePassage({
  image,
  language,
  clients,
  onReadInBible,
}: {
  image: VerseImage;
  language: string;
  clients: ImageLibraryClients;
  onReadInBible?: ReadImagePassage;
}) {
  const [version, setVersion] = useState<BibleVersion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError(null);
    setVersion(null);
    void resolveImageBible(clients.bible, language, image.passage_id).then(
      (resolved) => {
        if (active) setVersion(resolved);
      },
      (cause) => {
        if (active)
          setError(
            imageError(cause instanceof Error ? cause : new Error('Unable to load content.')),
          );
      },
    );
    return () => {
      active = false;
    };
  }, [clients, language, image.passage_id, retry]);
  return (
    <div>
      <p className="mbe-1 text-[0.8rem] text-muted-foreground">Verses in this image</p>
      {version ? (
        <BibleCard
          key={`${version.id}:${retry}`}
          reference={image.passage_id}
          versionId={version.id}
          showVersionPicker={false}
          highlights={[]}
        />
      ) : !error ? (
        <p role="status" className="py-4 text-muted-foreground">
          Loading passage…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="my-4 border-s-[3px] border-destructive ps-4">
          {error}
        </p>
      ) : null}
      <div className="my-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={!version || !onReadInBible}
          onClick={() => {
            if (version) onReadInBible?.(image.passage_id, version.id);
          }}
        >
          Read in Bible
        </Button>
        <Button type="button" variant="outline" onClick={() => setRetry((value) => value + 1)}>
          Retry passage
        </Button>
      </div>
    </div>
  );
}
