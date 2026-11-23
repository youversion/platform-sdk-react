import { useState } from 'react';
import { Dialog } from 'radix-ui';

const CONTENT_LANGUAGES = [
  'en',
  'es',
  'fr',
  'de',
  'it',
  'ja',
  'zh',
  'ru',
  'pt',
  'ko',
  'hi',
  'ar',
  'tr',
  'nl',
  'sv',
  'zh-CN',
  'zh-TW',
  'zh-HK',
];

export function ImageLanguagePicker({
  language,
  onChange,
}: {
  language: string;
  onChange: (language: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const locale = import.meta.env.VITE_YVP_LOCALE?.trim() || navigator.language;
  const displayNames = new Intl.DisplayNames([locale], { type: 'language' });
  const languages = CONTENT_LANGUAGES.map((tag) => ({ tag, name: displayNames.of(tag) ?? tag }))
    .filter(({ tag, name }) =>
      `${tag} ${name}`.toLocaleLowerCase(locale).includes(filter.trim().toLocaleLowerCase(locale)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setFilter('');
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button" className="image-button" aria-label="Content language">
          {displayNames.of(language) ?? language} <span aria-hidden="true">⌄</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="image-dialog-overlay" />
        <Dialog.Content className="image-dialog">
          <div className="image-dialog-inner">
            <div className="image-dialog-header">
              <Dialog.Title>Content language</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="image-button">
                  Close languages
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="image-eyebrow">
              Choose a language for images and their Bible passages.
            </Dialog.Description>
            <div className="image-toolbar">
              <input
                type="search"
                aria-label="Search languages"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </div>
            <div className="image-language-options">
              {languages.map(({ tag, name }) => (
                <button
                  type="button"
                  className="image-button"
                  key={tag}
                  aria-pressed={language === tag}
                  onClick={() => {
                    onChange(tag);
                    setOpen(false);
                    setFilter('');
                  }}
                >
                  {name}
                  {language === tag ? <span aria-hidden="true">✓</span> : null}
                </button>
              ))}
            </div>
            {!languages.length ? <p className="image-status">No languages found.</p> : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
