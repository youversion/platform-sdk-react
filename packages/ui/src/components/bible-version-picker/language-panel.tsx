'use client';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useInterfaceDirection } from '@/lib/direction';
import { ChevronBackwardIcon } from '../icons/chevron-backward';
import { LoaderIcon } from '../icons/loader';
import { SearchIcon } from '../icons/search';
import { Button } from '../ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group';
import { ItemGroup } from '../ui/item';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { forwardRef, useEffect, useRef, useState, type ReactElement, type RefObject } from 'react';
import {
  useBibleVersionPickerContext,
  type BibleLanguagePickerContentProps,
  type LanguageListItem,
} from './index';
import { LanguageRow } from './language-row';

const languageTabClassName =
  'yv:rounded-full yv:p-0 yv:text-sm yv:font-bold yv:text-foreground! yv:data-[state=active]:bg-foreground! yv:data-[state=active]:text-background! yv:data-[state=active]:shadow-none!';

export const LanguageSearchButton = forwardRef<HTMLButtonElement>(
  function LanguageSearchButton(_props, ref): ReactElement {
    const { t } = useTranslation(undefined, { i18n });
    const { setView } = useBibleVersionPickerContext();

    return (
      <Button
        ref={ref}
        type="button"
        variant="ghost"
        size="icon"
        className="yv:w-6 yv:h-6 yv:text-muted-foreground"
        aria-label={t('languageSearchAriaLabel')}
        data-slot="language-search-open"
        onClick={() => setView('languageSearch')}
      >
        <SearchIcon className="yv:size-5" />
      </Button>
    );
  },
);

export const LanguageBackButton = forwardRef<
  HTMLButtonElement,
  {
    label: string;
    onClick: () => void;
  }
>(function LanguageBackButton({ label, onClick }, ref): ReactElement {
  return (
    <Button
      ref={ref}
      type="button"
      onClick={onClick}
      variant="ghost"
      size="icon"
      className="yv:w-6 yv:h-6 yv:text-muted-foreground"
      data-slot="language-back"
    >
      <ChevronBackwardIcon className="yv:size-5" />
      <span className="yv:sr-only">{label}</span>
    </Button>
  );
});

export function LanguagePanel({
  onRequestClose,
}: BibleLanguagePickerContentProps = {}): ReactElement {
  return (
    <div className="yv:h-full yv:min-h-0 yv:overflow-hidden yv:flex yv:flex-col">
      <div className="yv:flex-1 yv:min-h-0 yv:overflow-hidden">
        <BibleLanguagePickerContent onRequestClose={onRequestClose} />
      </div>
    </div>
  );
}

function LanguageRows({
  languages,
  selectedLanguageId,
  onSelect,
  testId,
}: {
  languages: LanguageListItem[];
  selectedLanguageId: string;
  onSelect: (languageId: string) => void;
  testId?: string;
}): ReactElement {
  return (
    <ItemGroup className="yv:gap-1" data-testid={testId}>
      {languages.map((language) => (
        <LanguageRow
          key={language.id}
          language={language}
          onSelect={onSelect}
          selectedLanguageId={selectedLanguageId}
        />
      ))}
    </ItemGroup>
  );
}

/**
 * @internal Advanced composition surface for SDK integrations.
 *
 * Expo DOM wrappers should compose this content inside the `'use dom'` file and
 * expose only serializable props plus top-level async native actions to native.
 */
export function BibleLanguagePickerContent({
  open,
  onRequestClose,
}: BibleLanguagePickerContentProps = {}): ReactElement {
  const { t } = useTranslation(undefined, { i18n });
  const interfaceDirection = useInterfaceDirection();
  const {
    totalLanguages,
    selectedLanguageId,
    setSelectedLanguageId,
    suggestedLanguages,
    languages,
    filteredLanguages,
    languageSearchQuery,
    setLanguageSearchQuery,
    resetLanguageSearch,
    closeLanguageSearch,
    isLoadingLanguages,
    background,
    view,
    setView,
    headerOwnsChrome,
  } = useBibleVersionPickerContext();

  const [languageTab, setLanguageTab] = useState('suggested');
  const wasOpenRef = useRef(open ?? false);
  const panelRootRef = useRef<HTMLDivElement>(null);
  const searchOpenRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // RN standalone/Expo integrations keep this content mounted and toggle `open`.
  // Reopening should land on the language tabs, not a stale search screen.
  useEffect(() => {
    if (wasOpenRef.current && open === false) {
      resetLanguageSearch();
      if (view === 'languageSearch') {
        setView('languages');
      }
    }
    wasOpenRef.current = open ?? false;
  }, [open, resetLanguageSearch, setView, view]);

  useEffect(() => {
    if (view !== 'languageSearch') return;
    searchInputRef.current?.focus();
    return () => {
      const opener = searchOpenRef.current;
      const back = backRef.current;
      if (opener ?? back) {
        (opener ?? back)?.focus();
        return;
      }
      const scope =
        panelRootRef.current?.closest('[data-slot="popover-content"]') ?? panelRootRef.current;
      const scopedOpener = scope?.querySelector<HTMLElement>('[data-slot="language-search-open"]');
      const scopedBack = scope?.querySelector<HTMLElement>('[data-slot="language-back"]');
      (scopedOpener ?? scopedBack)?.focus();
    };
  }, [view]);

  const handleSelectLanguage = (languageId: string) => {
    setSelectedLanguageId(languageId);
    resetLanguageSearch();
    onRequestClose?.();
  };

  const searching = view === 'languageSearch';
  const query = languageSearchQuery.trim();

  return (
    <div
      ref={panelRootRef}
      className="yv:h-full yv:min-h-0 yv:overflow-hidden yv:flex yv:flex-col yv:font-sans"
      data-yv-sdk
      data-yv-theme={background}
      dir={interfaceDirection}
      data-open={open}
    >
      {searching ? (
        <LanguageSearchView
          backRef={backRef}
          closeLanguageSearch={closeLanguageSearch}
          filteredLanguages={filteredLanguages}
          headerOwnsChrome={headerOwnsChrome}
          isLoadingLanguages={isLoadingLanguages}
          languageSearchQuery={languageSearchQuery}
          onQueryChange={setLanguageSearchQuery}
          onSelect={handleSelectLanguage}
          query={query}
          searchInputRef={searchInputRef}
          selectedLanguageId={selectedLanguageId}
          suggestedLanguages={suggestedLanguages}
        />
      ) : (
        <>
          {headerOwnsChrome ? null : (
            <div className="yv:flex yv:justify-end yv:px-4 yv:pt-4">
              <LanguageSearchButton ref={searchOpenRef} />
            </div>
          )}
          <Tabs
            className="yv:mt-4 yv:gap-4 yv:flex-1 yv:min-h-0 yv:flex yv:flex-col"
            dir={interfaceDirection}
            value={languageTab}
            onValueChange={setLanguageTab}
          >
            <TabsList className="yv:mx-4 yv:w-[calc(100%-4*var(--spacing)*2)] yv:rounded-full yv:border yv:border-border yv:bg-transparent yv:p-0.5">
              <TabsTrigger className={languageTabClassName} value="suggested">
                {t('suggestedTab')}
              </TabsTrigger>
              <TabsTrigger className={languageTabClassName} value="all">
                {t('allLanguagesTab', { count: totalLanguages })}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="suggested" className="yv:overflow-y-auto yv:flex-1 yv:min-h-0">
              {suggestedLanguages.length > 0 ? (
                <>
                  <h3 className="yv:bg-popover yv:px-4 yv:pb-2 yv:text-xl yv:font-bold">
                    {t('regionalHeading')}
                  </h3>
                  <LanguageRows
                    languages={suggestedLanguages}
                    onSelect={handleSelectLanguage}
                    selectedLanguageId={selectedLanguageId}
                  />
                </>
              ) : (
                <p className="yv:px-4 yv:py-8 yv:text-center yv:text-muted-foreground">
                  {t('noRegionalLanguagesAvailable')}
                </p>
              )}
            </TabsContent>

            <TabsContent value="all" className="yv:overflow-y-auto yv:flex-1 yv:min-h-0">
              <h3 className="yv:bg-popover yv:px-4 yv:pb-2 yv:text-xl yv:font-bold">
                {t('allLanguagesHeading')}
              </h3>
              <LanguageRows
                languages={languages}
                onSelect={handleSelectLanguage}
                selectedLanguageId={selectedLanguageId}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function LanguageSearchView({
  backRef,
  closeLanguageSearch,
  filteredLanguages,
  headerOwnsChrome,
  isLoadingLanguages,
  languageSearchQuery,
  onQueryChange,
  onSelect,
  query,
  searchInputRef,
  selectedLanguageId,
  suggestedLanguages,
}: {
  backRef: RefObject<HTMLButtonElement | null>;
  closeLanguageSearch: () => void;
  filteredLanguages: LanguageListItem[];
  headerOwnsChrome: boolean;
  isLoadingLanguages: boolean;
  languageSearchQuery: string;
  onQueryChange: (query: string) => void;
  onSelect: (languageId: string) => void;
  query: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  selectedLanguageId: string;
  suggestedLanguages: LanguageListItem[];
}): ReactElement {
  const { t } = useTranslation(undefined, { i18n });

  return (
    <>
      {headerOwnsChrome ? null : (
        <div className="yv:px-4 yv:pt-4">
          <LanguageBackButton ref={backRef} label={t('back')} onClick={closeLanguageSearch} />
        </div>
      )}
      <section className="yv:p-4">
        <InputGroup className="yv:bg-background yv:shadow-none yv:border-border">
          <InputGroupInput
            ref={searchInputRef}
            aria-label={t('languageSearchAriaLabel')}
            type="text"
            placeholder={t('searchPlaceholder')}
            dir="auto"
            value={languageSearchQuery}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <InputGroupAddon>
            <SearchIcon className="yv:size-5 yv:text-muted-foreground" />
          </InputGroupAddon>
        </InputGroup>
      </section>
      <div className="yv:flex-1 yv:min-h-0 yv:overflow-y-auto">
        {query ? (
          isLoadingLanguages ? (
            <div className="yv:flex yv:flex-1 yv:items-center yv:justify-center yv:py-8">
              <LoaderIcon className="yv:size-6 yv:animate-spin yv:text-muted-foreground" />
            </div>
          ) : filteredLanguages.length > 0 ? (
            <LanguageRows
              languages={filteredLanguages}
              onSelect={onSelect}
              selectedLanguageId={selectedLanguageId}
              testId="language-search-results"
            />
          ) : (
            <p className="yv:px-4 yv:py-8 yv:text-center yv:text-muted-foreground yv:text-sm">
              {t('noLanguageSearchResults')}
            </p>
          )
        ) : suggestedLanguages.length > 0 ? (
          <>
            <h3 className="yv:bg-popover yv:px-4 yv:pb-2 yv:text-xl yv:font-bold">
              {t('regionalHeading')}
            </h3>
            <LanguageRows
              languages={suggestedLanguages}
              onSelect={onSelect}
              selectedLanguageId={selectedLanguageId}
            />
          </>
        ) : (
          <p className="yv:px-4 yv:py-8 yv:text-center yv:text-muted-foreground">
            {t('noRegionalLanguagesAvailable')}
          </p>
        )}
      </div>
    </>
  );
}
