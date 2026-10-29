import { useMemo, useState, type FormEvent } from 'react';
import {
  ApiClient,
  SearchClient,
  type SearchUnifiedField,
  type SearchUnifiedResponse,
} from '@youversion/platform-react-ui';
import { API_TIMEOUT_MS } from '../api-timeout';

type FieldMode = 'images' | 'images_and_verses';

type DemoStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; data: SearchUnifiedResponse; fieldMode: FieldMode }
  | { kind: 'error'; message: string };

const DEFAULT_QUERY = 'psalm 23';
const DEFAULT_VERSION_ID = 3034;
const DEFAULT_LANGUAGE = 'en';

function fieldsForMode(mode: FieldMode): SearchUnifiedField[] {
  if (mode === 'images') {
    return ['images'];
  }
  return ['images', 'verses'];
}

function parseFieldMode(value: string): FieldMode | null {
  if (value === 'images' || value === 'images_and_verses') {
    return value;
  }
  return null;
}

function messageFromError(error: Error): string {
  return error.message.trim() || 'searchUnified failed';
}

export function SearchUnifiedPage() {
  const appKey = import.meta.env.VITE_YVP_APP_KEY?.trim() ?? '';
  const apiHost = import.meta.env.VITE_YVP_API_HOST ?? 'api.youversion.com';

  const searchClient = useMemo(
    () =>
      new SearchClient(
        new ApiClient({
          appKey,
          apiHost,
          timeout: API_TIMEOUT_MS,
        }),
      ),
    [appKey, apiHost],
  );

  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [versionId, setVersionId] = useState(String(DEFAULT_VERSION_ID));
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [fieldMode, setFieldMode] = useState<FieldMode>('images_and_verses');
  const [status, setStatus] = useState<DemoStatus>({ kind: 'idle' });

  async function runSearch() {
    const parsedVersionId = Number(versionId);
    if (!Number.isInteger(parsedVersionId) || parsedVersionId <= 0) {
      setStatus({ kind: 'error', message: 'versionId must be a positive integer' });
      return;
    }

    const submittedFieldMode = fieldMode;
    setStatus({ kind: 'loading' });
    try {
      const data = await searchClient.searchUnified(query, parsedVersionId, language, {
        fields: fieldsForMode(submittedFieldMode),
      });
      setStatus({ kind: 'ok', data, fieldMode: submittedFieldMode });
    } catch (error) {
      const message = error instanceof Error ? messageFromError(error) : 'searchUnified failed';
      setStatus({ kind: 'error', message });
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch();
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-6 p-6 md:p-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Unified search smoke</h1>
        <p className="text-sm text-muted-foreground">
          Calls <code>SearchClient.searchUnified</code>. Image hits are id + passageId only.
        </p>
      </div>

      {!appKey ? (
        <p className="text-sm text-destructive">
          Missing <code>YVP_APP_KEY</code> / <code>VITE_YVP_APP_KEY</code> in the monorepo root{' '}
          <code>.env</code>.
        </p>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <label className="flex flex-col gap-1 text-sm">
          Query
          <input
            className="rounded-md border bg-background px-3 py-2"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Bible version id
          <input
            className="rounded-md border bg-background px-3 py-2"
            value={versionId}
            onChange={(event) => setVersionId(event.target.value)}
            inputMode="numeric"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Language range
          <input
            className="rounded-md border bg-background px-3 py-2"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Fields
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={fieldMode}
            onChange={(event) => {
              const next = parseFieldMode(event.target.value);
              if (next !== null) {
                setFieldMode(next);
              }
            }}
          >
            <option value="images">images</option>
            <option value="images_and_verses">images + verses</option>
          </select>
        </label>
        <button
          type="submit"
          className="self-start rounded-md border bg-secondary px-3 py-2 text-sm"
          disabled={status.kind === 'loading' || !appKey}
        >
          {status.kind === 'loading' ? 'Searching…' : 'Search'}
        </button>
      </form>

      {status.kind === 'idle' ? (
        <p className="text-sm text-muted-foreground">Submit to run searchUnified.</p>
      ) : null}
      {status.kind === 'loading' ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {status.kind === 'error' ? (
        <p className="text-sm text-destructive" role="alert">
          {status.message}
        </p>
      ) : null}
      {status.kind === 'ok' ? <Results data={status.data} fieldMode={status.fieldMode} /> : null}
    </div>
  );
}

function Results({ data, fieldMode }: { data: SearchUnifiedResponse; fieldMode: FieldMode }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Images ({data.images.length})</h2>
        {data.images.length === 0 ? (
          <p className="text-sm text-muted-foreground">No image hits.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {data.images.map((image) => (
              <li key={image.id} className="font-mono">
                {image.id} · {image.passageId}
              </li>
            ))}
          </ul>
        )}
      </section>

      {fieldMode === 'images_and_verses' ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Verses ({data.verses.length})</h2>
          {data.verses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No verse hits.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm font-mono">
              {data.verses.map((verse) => (
                <li key={verse.id}>{verse.id}</li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
