import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { BibleCard, type BibleVersion, type VerseImage } from '@youversion/platform-react-ui';
import { ImageArt } from './image-art';
import { ImageShare } from './image-share';
import { ImageStack } from './image-stack';
import {
  imageError,
  resolveImageBible,
  type ImageLibraryClients,
  type ReadImagePassage,
} from './image-library-api';

export function ImageDetail({
  image,
  language,
  clients,
  onBack,
  onReadInBible,
}: {
  image: VerseImage;
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
  const viewerButton = useRef<HTMLButtonElement>(null);
  const selected = images.find((item) => item.id === selectedId) ?? images[0] ?? image;

  useEffect(() => {
    let active = true;
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
          if (!active) return;
          const ids = new Set(collected.map((item) => item.id));
          collected = [
            ...collected,
            ...page.data.filter((item) => {
              if (ids.has(item.id)) return false;
              ids.add(item.id);
              return true;
            }),
          ];
          setImages(collected);
          token = page.next_page_token;
          if (token !== null && visited.has(token))
            throw new Error('The image service repeated a page. Please retry.');
          if (token !== null) visited.add(token);
        } while (token !== null);
      } catch (cause) {
        if (active)
          setError(
            imageError(cause instanceof Error ? cause : new Error('Unable to load content.')),
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [clients, image, language, retry]);

  return (
    <section aria-label="Image detail">
      <div className="image-actions">
        <button type="button" className="image-button" onClick={onBack}>
          Back to images
        </button>
        <ImageShare key={selected.id} image={selected} />
      </div>
      <p className="image-eyebrow">Verse images</p>
      <h2 dir="auto">{image.passage_id}</h2>
      <ImageStack
        images={images}
        selected={selected}
        onSelect={(item) => setSelectedId(item.id)}
        onOpen={() => setOpen(true)}
        viewerButtonRef={viewerButton}
      />
      {loading ? (
        <p className="image-status" role="status">
          Loading more artwork…
        </p>
      ) : null}
      {error ? (
        <div className="image-error">
          <p role="alert">{error}</p>
          <button
            type="button"
            className="image-button"
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry artwork list
          </button>
        </div>
      ) : null}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="image-dialog-overlay" />
          <Dialog.Content
            className="image-dialog"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              viewerButton.current?.focus();
            }}
          >
            <div className="image-dialog-inner">
              <div className="image-dialog-header">
                <Dialog.Close asChild>
                  <button type="button" className="image-button">
                    Close image
                  </button>
                </Dialog.Close>
                <Dialog.Title>Verse image</Dialog.Title>
                <ImageShare key={selected.id} image={selected} />
              </div>
              <Dialog.Description className="image-eyebrow">
                Artwork and its Bible passage
              </Dialog.Description>
              <ImageArt key={selected.id} image={selected} size="full" />
              <p className="image-status" dir="auto">
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
      <p className="image-eyebrow">Verses in this image</p>
      {version ? (
        <BibleCard
          key={`${version.id}:${retry}`}
          reference={image.passage_id}
          versionId={version.id}
          showVersionPicker={false}
          highlights={[]}
        />
      ) : !error ? (
        <p role="status" className="image-status">
          Loading passage…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="image-error">
          {error}
        </p>
      ) : null}
      <div className="image-actions">
        <button
          type="button"
          className="image-button image-primary"
          disabled={!version || !onReadInBible}
          onClick={() => {
            if (version) onReadInBible?.(image.passage_id, version.id);
          }}
        >
          Read in Bible
        </button>
        <button
          type="button"
          className="image-button"
          onClick={() => setRetry((value) => value + 1)}
        >
          Retry passage
        </button>
      </div>
    </div>
  );
}
