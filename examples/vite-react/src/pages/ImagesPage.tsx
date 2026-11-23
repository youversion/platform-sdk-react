import { useEffect, useRef, useState } from 'react';
import {
  ApiClient,
  ImagesClient,
  getHttpStatus,
  parseUsfmReference,
  type Collection,
  type VerseImage,
} from '@youversion/platform-react-ui';
import { API_TIMEOUT_MS } from '../api-timeout';
import { formatHash } from '@/routes';

const DEFAULT_PASSAGE_ID = 'JHN.3.16';
const LIST_PAGE_SIZE = 12;

type ListState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'ready'; page: Collection<VerseImage> }
  | { kind: 'error'; message: string };

type DetailState =
  | { kind: 'idle' }
  | { kind: 'loading'; imageId: string }
  | { kind: 'ready'; imageId: string; image: VerseImage }
  | { kind: 'error'; imageId: string; message: string };

function createImagesClient(): ImagesClient {
  const appKey = import.meta.env.VITE_YVP_APP_KEY?.trim();
  if (!appKey) {
    throw new Error('Missing VITE_YVP_APP_KEY (set YVP_APP_KEY in the monorepo root .env)');
  }
  const apiHost = import.meta.env.VITE_YVP_API_HOST ?? 'api.youversion.com';
  return new ImagesClient(new ApiClient({ appKey, apiHost, timeout: API_TIMEOUT_MS }));
}

function formatCaughtError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  const status = getHttpStatus(cause);
  return status != null ? `HTTP ${status}: ${message}` : message;
}

function thumbUrl(imageUrl: string): string {
  const url = new URL(imageUrl);
  url.searchParams.set('size', 'thumb');
  return url.toString();
}

export function ImagesPage({
  imageId,
  onReadInBible,
}: {
  imageId: string | null;
  onReadInBible: (passageId: string) => void;
}) {
  const [list, setList] = useState<ListState>({ kind: 'loading' });
  const [detail, setDetail] = useState<DetailState>({ kind: 'idle' });
  const [passageRejected, setPassageRejected] = useState(false);
  const detailRequestId = useRef(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const client = createImagesClient();
        const page = await client.getImages({
          passage_id: DEFAULT_PASSAGE_ID,
          page_size: LIST_PAGE_SIZE,
        });
        if (cancelled) return;
        if (page.data.length === 0) {
          setList({ kind: 'empty' });
          return;
        }
        setList({ kind: 'ready', page });
      } catch (err) {
        if (cancelled) return;
        setList({ kind: 'error', message: formatCaughtError(err) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const requestId = ++detailRequestId.current;
    if (imageId === null) {
      setDetail({ kind: 'idle' });
      setPassageRejected(false);
      return;
    }
    const requestedId = imageId;
    setDetail({ kind: 'loading', imageId: requestedId });
    setPassageRejected(false);
    void (async () => {
      try {
        const image = await createImagesClient().getImage(requestedId);
        if (requestId !== detailRequestId.current) return;
        setDetail({ kind: 'ready', imageId: requestedId, image });
      } catch (err) {
        if (requestId !== detailRequestId.current) return;
        setDetail({
          kind: 'error',
          imageId: requestedId,
          message: formatCaughtError(err),
        });
      }
    })();
  }, [imageId]);

  function readPassage(passageId: string) {
    if (parseUsfmReference(passageId) === null) {
      setPassageRejected(true);
      return;
    }
    setPassageRejected(false);
    onReadInBible(passageId);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6 md:p-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Images API smoke</h1>
        <p className="text-sm text-muted-foreground">
          Core <code>ImagesClient.getImages</code> / <code>getImage</code> against passage{' '}
          <code>{DEFAULT_PASSAGE_ID}</code>. Not a product UI.
        </p>
      </header>

      {list.kind === 'loading' ? <p className="text-sm">Loading list…</p> : null}

      {list.kind === 'error' ? (
        <p className="text-sm text-destructive" role="alert">
          {list.message}
        </p>
      ) : null}

      {list.kind === 'empty' ? (
        <p className="text-sm text-muted-foreground">No images for this passage.</p>
      ) : null}

      {list.kind === 'ready' ? (
        <>
          <p className="text-sm text-muted-foreground">
            {list.page.data.length} shown
            {list.page.total_size != null ? ` · total_size ${list.page.total_size}` : null}
            {list.page.next_page_token ? ' · more pages available' : ' · last page'}
          </p>
          <ul className="flex flex-col gap-2">
            {list.page.data.map((item) => (
              <li key={item.id}>
                <a
                  href={formatHash({ destination: 'content', imageId: item.id })}
                  className="block w-full rounded border px-3 py-2 text-start text-sm hover:bg-muted"
                  aria-current={item.id === imageId ? 'page' : undefined}
                >
                  <div className="font-mono text-xs break-all">{item.id}</div>
                  <div className="text-muted-foreground">
                    {item.passage_id} · {item.language_tag} · {item.width}×{item.height}
                  </div>
                  <div className="truncate font-mono text-xs text-muted-foreground">
                    {item.image_url}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {detail.kind === 'loading' && detail.imageId === imageId ? (
        <p className="text-sm">Loading detail…</p>
      ) : null}
      {detail.kind === 'error' && detail.imageId === imageId ? (
        <p className="text-sm text-destructive" role="alert">
          Detail: {detail.message}
        </p>
      ) : null}

      {imageId !== null ? (
        <p className="text-sm">
          <a href={formatHash({ destination: 'content', imageId: null })} className="underline">
            Back to list
          </a>
        </p>
      ) : null}

      {detail.kind === 'ready' && detail.imageId === imageId ? (
        <section className="flex flex-col gap-3 rounded border p-4">
          <h2 className="text-sm font-semibold">Detail</h2>
          <dl className="grid gap-1 text-sm">
            <div>
              <dt className="text-muted-foreground">id</dt>
              <dd className="font-mono text-xs break-all">{detail.image.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">passage_id</dt>
              <dd>{detail.image.passage_id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">attribution</dt>
              <dd>{detail.image.attribution || '(empty)'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">image_url</dt>
              <dd className="font-mono text-xs break-all">{detail.image.image_url}</dd>
            </div>
          </dl>
          <img
            src={thumbUrl(detail.image.image_url)}
            alt=""
            className="max-h-64 w-auto self-start rounded"
          />
          <button
            type="button"
            className="self-start text-sm underline"
            onClick={() => readPassage(detail.image.passage_id)}
          >
            Read in Bible
          </button>
          {passageRejected ? (
            <p className="text-sm text-destructive" role="alert">
              Passage ID is not a Bible reference the reader can open.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
