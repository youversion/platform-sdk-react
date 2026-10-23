import { useEffect, useRef, useState } from 'react';
import {
  ApiClient,
  ImagesClient,
  getHttpStatus,
  type Collection,
  type Image,
} from '@youversion/platform-react-ui';
import { API_TIMEOUT_MS } from '../api-timeout';

const DEFAULT_PASSAGE_ID = 'JHN.3.16';
const LIST_PAGE_SIZE = 12;

type ImagesDemoState =
  | { kind: 'loading'; passageId: string }
  | { kind: 'empty'; passageId: string }
  | { kind: 'list'; passageId: string; page: Collection<Image> }
  | { kind: 'detail'; passageId: string; page: Collection<Image>; image: Image }
  | { kind: 'error'; passageId: string; message: string };

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

export function ImagesPage() {
  const [state, setState] = useState<ImagesDemoState>({
    kind: 'loading',
    passageId: DEFAULT_PASSAGE_ID,
  });
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
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
          setState({ kind: 'empty', passageId: DEFAULT_PASSAGE_ID });
          return;
        }
        setState({ kind: 'list', passageId: DEFAULT_PASSAGE_ID, page });
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: 'error',
          passageId: DEFAULT_PASSAGE_ID,
          message: formatCaughtError(err),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function openDetail(page: Collection<Image>, imageId: string) {
    const requestId = ++detailRequestId.current;
    setDetailError(null);
    setDetailBusy(true);
    try {
      const image = await createImagesClient().getImage(imageId);
      if (requestId !== detailRequestId.current) return;
      setState({
        kind: 'detail',
        passageId: DEFAULT_PASSAGE_ID,
        page,
        image,
      });
    } catch (err) {
      if (requestId !== detailRequestId.current) return;
      setDetailError(formatCaughtError(err));
    } finally {
      if (requestId === detailRequestId.current) {
        setDetailBusy(false);
      }
    }
  }

  function backToList(page: Collection<Image>) {
    detailRequestId.current += 1;
    setDetailBusy(false);
    setDetailError(null);
    setState({ kind: 'list', passageId: DEFAULT_PASSAGE_ID, page });
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

      {state.kind === 'loading' ? <p className="text-sm">Loading list…</p> : null}

      {state.kind === 'error' ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.kind === 'empty' ? (
        <p className="text-sm text-muted-foreground">No images for this passage.</p>
      ) : null}

      {state.kind === 'list' || state.kind === 'detail' ? (
        <>
          <p className="text-sm text-muted-foreground">
            {state.page.data.length} shown
            {state.page.total_size != null ? ` · total_size ${state.page.total_size}` : null}
            {state.page.next_page_token ? ' · more pages available' : ' · last page'}
          </p>
          <ul className="flex flex-col gap-2">
            {state.page.data.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="w-full rounded border px-3 py-2 text-start text-sm hover:bg-muted disabled:opacity-50"
                  disabled={detailBusy}
                  onClick={() => void openDetail(state.page, item.id)}
                >
                  <div className="font-mono text-xs break-all">{item.id}</div>
                  <div className="text-muted-foreground">
                    {item.passage_id} · {item.language_tag} · {item.width}×{item.height}
                  </div>
                  <div className="truncate font-mono text-xs text-muted-foreground">
                    {item.image_url}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {detailBusy ? <p className="text-sm">Loading detail…</p> : null}
      {detailError ? (
        <p className="text-sm text-destructive" role="alert">
          Detail: {detailError}
        </p>
      ) : null}

      {state.kind === 'detail' ? (
        <section className="flex flex-col gap-3 rounded border p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Detail</h2>
            <button
              type="button"
              className="text-sm underline"
              onClick={() => backToList(state.page)}
            >
              Back to list
            </button>
          </div>
          <dl className="grid gap-1 text-sm">
            <div>
              <dt className="text-muted-foreground">id</dt>
              <dd className="font-mono text-xs break-all">{state.image.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">passage_id</dt>
              <dd>{state.image.passage_id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">attribution</dt>
              <dd>{state.image.attribution || '(empty)'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">image_url</dt>
              <dd className="font-mono text-xs break-all">{state.image.image_url}</dd>
            </div>
          </dl>
          <img
            src={thumbUrl(state.image.image_url)}
            alt=""
            className="max-h-64 w-auto self-start rounded"
          />
        </section>
      ) : null}
    </div>
  );
}
