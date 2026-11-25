import { ImageLibraryButton as Button } from './image-library-button';
import { useEffect, useState } from 'react';
import { Dialog } from 'radix-ui';
import { ChevronDown } from 'lucide-react';

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

function contentLocale(): string {
  const configured = import.meta.env.VITE_YVP_LOCALE?.trim() || navigator.language;
  try {
    return Intl.getCanonicalLocales(configured.replaceAll('_', '-'))[0] ?? 'en';
  } catch {
    return 'en';
  }
}

export function ImageLanguagePicker({
  language,
  active = true,
  onChange,
}: {
  language: string;
  active?: boolean;
  onChange: (language: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  useEffect(() => {
    if (!active) {
      setOpen(false);
      setFilter('');
    }
  }, [active]);
  const locale = contentLocale();
  const displayNames = new Intl.DisplayNames([locale], { type: 'language' });
  const languages = CONTENT_LANGUAGES.map((tag) => ({ tag, name: displayNames.of(tag) ?? tag }))
    .filter(({ tag, name }) =>
      `${tag} ${name}`.toLocaleLowerCase(locale).includes(filter.trim().toLocaleLowerCase(locale)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  return (
    <Dialog.Root
      open={active && open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setFilter('');
      }}
    >
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`Content language: ${displayNames.of(language) ?? language}`}
        >
          {displayNames.of(language) ?? language}
          <ChevronDown size={16} className="shrink-0" aria-hidden="true" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-60 bg-black/60" />
        <Dialog.Content
          className="fixed inset-4 z-[61] overflow-y-auto rounded-3xl bg-background p-[clamp(1rem,3vw,2rem)] text-foreground motion-reduce:[&_*]:scroll-auto"
          onCloseAutoFocus={(event) => {
            if (!active) event.preventDefault();
          }}
        >
          <div className="mx-auto max-w-[40rem]">
            <div className="mbe-6 flex items-center justify-between gap-2 max-[30rem]:grid max-[30rem]:grid-cols-[auto_1fr] max-[30rem]:[&_h2]:text-end">
              <Dialog.Title>Content language</Dialog.Title>
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  Close languages
                </Button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="mbe-1 text-[0.8rem] text-muted-foreground">
              Choose a language for images and their Bible passages.
            </Dialog.Description>
            <div className="mbe-6 flex items-center gap-2 rounded-[2rem] bg-muted p-2">
              <input
                className="min-w-0 flex-1 rounded-[2rem] bg-transparent px-3 py-2 outline-offset-3 focus-visible:outline-2 focus-visible:outline-foreground"
                type="search"
                aria-label="Search languages"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </div>
            <div className="mbs-4 flex flex-col gap-2">
              {languages.map(({ tag, name }) => (
                <Button
                  type="button"
                  variant="outline"
                  className="justify-between"
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
                </Button>
              ))}
            </div>
            {!languages.length ? (
              <p className="py-4 text-muted-foreground">No languages found.</p>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
