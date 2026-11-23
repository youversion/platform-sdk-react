import { useRef, useState, type FormEvent } from 'react';
import { clampSearchText, type VerseImage } from '@youversion/platform-react-ui';
import {
  createImageLibraryClients,
  type ImageLibraryClients,
  type ReadImagePassage,
} from './image-library-api';
import { ImageLanguagePicker } from './image-language-picker';
import { ImageDetail } from './image-detail';
import { ImageArt } from './image-art';
import { useImageResults } from './use-image-results';
import './image-library.css';

export function ImagesPage({ onReadInBible }: { onReadInBible?: ReadImagePassage }) {
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
    setQuery(value);
  }
  return (
    <div className="image-library">
      <header>
        <div>
          <p className="image-eyebrow">Content library</p>
          <h1>Verse images</h1>
        </div>
        <ImageLanguagePicker language={language} onChange={setLanguage} />
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
  onReadInBible,
}: {
  clients: ImageLibraryClients;
  language: string;
  query: string;
  onReadInBible?: ReadImagePassage;
}) {
  const { images, loading, error, hasMore, load } = useImageResults(clients, language, query);
  const [selected, setSelected] = useState<VerseImage | null>(null);
  const listScroll = useRef(0);
  const openedCard = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      {selected ? (
        <ImageDetail
          image={selected}
          clients={clients}
          language={language}
          onReadInBible={onReadInBible}
          onBack={() => {
            setSelected(null);
            requestAnimationFrame(() => {
              openedCard.current?.focus({ preventScroll: true });
              window.scrollTo(0, listScroll.current);
            });
          }}
        />
      ) : null}
      <div hidden={selected !== null}>
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
              <button
                className="image-open"
                type="button"
                aria-label={`Open ${image.passage_id}`}
                onClick={(event) => {
                  openedCard.current = event.currentTarget;
                  listScroll.current = window.scrollY;
                  setSelected(image);
                  window.scrollTo(0, 0);
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
    </>
  );
}
