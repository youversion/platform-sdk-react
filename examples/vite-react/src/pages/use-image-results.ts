import { useCallback, useEffect, useRef, useState } from 'react';
import type { SearchImagesResponse, VerseImage } from '@youversion/platform-react-ui';
import { imageError, resolveImageBible, type ImageLibraryClients } from './image-library-api';

const PAGE_SIZE = 30;
type ResultSession = {
  active: boolean;
  busy: boolean;
  token: string | null;
  versionId?: number;
  pending: SearchImagesResponse | null;
  ids: string[];
  resolved: Map<string, VerseImage>;
  consumed: Set<string>;
};

// A mounted results view owns one submitted query/language. Cleanup invalidates its work.
export function useImageResults(clients: ImageLibraryClients, language: string, query: string) {
  const [images, setImages] = useState<VerseImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const session = useRef<ResultSession>({
    active: false,
    busy: false,
    token: null,
    versionId: undefined,
    pending: null,
    ids: [],
    resolved: new Map<string, VerseImage>(),
    consumed: new Set<string>(),
  });

  const load = useCallback(async () => {
    const current = session.current;
    if (!current.active || current.busy) return;
    current.busy = true;
    setLoading(true);
    setError(null);
    try {
      let pageImages: readonly VerseImage[];
      let nextToken: string | null;
      if (query) {
        if (current.versionId === undefined) {
          const version = await resolveImageBible(clients.bible, language);
          if (!current.active) return;
          current.versionId = version.id;
        }
        if (!current.pending) {
          const page = await clients.search.searchImages(query, current.versionId, {
            pageSize: PAGE_SIZE,
            pageToken: current.token ?? undefined,
          });
          if (!current.active) return;
          current.pending = page;
          for (const hit of page.images)
            if (!current.ids.includes(hit.id)) current.ids.push(hit.id);
        }
        const pending = current.pending;
        const results = await Promise.allSettled(
          [...new Set(pending.images.map((hit) => hit.id))]
            .filter((id) => !current.resolved.has(id))
            .map(async (id) => ({ id, image: await clients.images.getImage(id) })),
        );
        if (!current.active) return;
        for (const result of results)
          if (result.status === 'fulfilled')
            current.resolved.set(result.value.id, result.value.image);
        setImages(
          current.ids.flatMap((id) => {
            const image = current.resolved.get(id);
            return image ? [image] : [];
          }),
        );
        const failed = results.find((result) => result.status === 'rejected');
        if (failed?.status === 'rejected') throw failed.reason;
        pageImages = [];
        nextToken = pending.nextPageToken;
        current.pending = null;
      } else {
        const page = await clients.images.getImages({
          language_ranges: [language],
          page_size: PAGE_SIZE,
          page_token: current.token,
        });
        if (!current.active) return;
        pageImages = page.data;
        nextToken = page.next_page_token;
        setImages((previous) => {
          const known = new Set(previous.map((image) => image.id));
          return [
            ...previous,
            ...pageImages.filter((image) => {
              if (known.has(image.id)) return false;
              known.add(image.id);
              return true;
            }),
          ];
        });
      }
      if (current.token !== null) current.consumed.add(current.token);
      if (nextToken !== null && current.consumed.has(nextToken)) {
        setHasMore(false);
        throw new Error(
          'The image service repeated a page. Clear the search or choose another language to start again.',
        );
      }
      current.token = nextToken;
      setHasMore(nextToken !== null);
    } catch (cause) {
      if (current.active)
        setError(imageError(cause instanceof Error ? cause : new Error('Unable to load images.')));
    } finally {
      if (current.active) {
        current.busy = false;
        setLoading(false);
      }
    }
  }, [clients, language, query]);

  useEffect(() => {
    // StrictMode cleanup must not reactivate a previous request's session.
    const current = { ...session.current, active: true, busy: false };
    session.current = current;
    void load();
    return () => {
      current.active = false;
    };
  }, [load]);

  return { images, loading, error, hasMore, load };
}
