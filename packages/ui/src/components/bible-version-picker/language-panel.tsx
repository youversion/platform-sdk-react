'use client';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useInterfaceDirection } from '@/lib/direction';
import { LoaderIcon } from '../icons/loader';
import { SearchIcon } from '../icons/search';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group';
import { ItemGroup } from '../ui/item';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useEffect, useRef, useState } from 'react';
import { useBibleVersionPickerContext, type BibleLanguagePickerContentProps } from './index';
import { LanguageRow } from './language-row';

export function LanguagePanel({
  onRequestClose,
}: BibleLanguagePickerContentProps = {}): React.ReactElement {
  return (
    <div className="yv:h-full yv:min-h-0 yv:overflow-hidden yv:flex yv:flex-col yv:transition-all yv:duration-300 yv:rounded-2xl yv:origin-center">
      <div className="yv:flex-1 yv:min-h-0 yv:overflow-hidden">
        <BibleLanguagePickerContent onRequestClose={onRequestClose} />
      </div>
    </div>
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
}: BibleLanguagePickerContentProps = {}): React.ReactElement {
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
    isLoadingLanguages,
    background,
  } = useBibleVersionPickerContext();

  const [languageTab, setLanguageTab] = useState('suggested');
  const wasOpenRef = useRef(open ?? false);

  // RN standalone/Expo integrations keep this content mounted and toggle `open`;
  // reset search so reopening starts on suggested/all tabs, not stale results.
  useEffect(() => {
    if (wasOpenRef.current && open === false) {
      resetLanguageSearch();
    }
    wasOpenRef.current = open ?? false;
  }, [open, resetLanguageSearch]);

  const isSearching = languageSearchQuery.trim().length > 0;

  const handleSelectLanguage = (languageId: string) => {
    setSelectedLanguageId(languageId);
    resetLanguageSearch();
    onRequestClose?.();
  };

  return (
    <div
      className="yv:h-full yv:min-h-0 yv:overflow-hidden yv:flex yv:flex-col"
      data-yv-sdk
      data-yv-theme={background}
      dir={interfaceDirection}
      data-open={open}
    >
      {isSearching ? (
        <div className="yv:mt-4 yv:flex-1 yv:min-h-0 yv:overflow-y-auto">
          {isLoadingLanguages ? (
            <div className="yv:flex yv:flex-1 yv:items-center yv:justify-center yv:py-8">
              <LoaderIcon className="yv:size-6 yv:animate-spin yv:text-muted-foreground" />
            </div>
          ) : filteredLanguages.length > 0 ? (
            <ItemGroup className="yv:gap-1" data-testid="language-search-results">
              {filteredLanguages.map((language) => (
                <LanguageRow
                  key={language.id}
                  language={language}
                  onSelect={handleSelectLanguage}
                  selectedLanguageId={selectedLanguageId}
                />
              ))}
            </ItemGroup>
          ) : (
            <p className="yv:px-4 yv:py-8 yv:text-center yv:text-muted-foreground yv:text-sm">
              {t('noLanguageSearchResults')}
            </p>
          )}
        </div>
      ) : (
        <Tabs
          className="yv:mt-4 yv:gap-4 yv:flex-1 yv:min-h-0 yv:flex yv:flex-col"
          dir={interfaceDirection}
          value={languageTab}
          onValueChange={setLanguageTab}
        >
          <TabsList className="yv:mx-4 yv:w-[calc(100%-4*var(--spacing)*2)]">
            <TabsTrigger className="yv:p-0" value="suggested">
              {t('suggestedTab')}
            </TabsTrigger>
            <TabsTrigger className="yv:p-0" value="all">
              {t('allLanguagesTab', { count: totalLanguages })}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suggested" className="yv:overflow-y-auto yv:flex-1 yv:min-h-0">
            {suggestedLanguages.length > 0 ? (
              <>
                <h3 className="yv:bg-popover yv:px-4 yv:pb-2 yv:text-lg yv:font-bold">
                  {t('regionalHeading')}
                </h3>
                <ItemGroup className="yv:gap-1">
                  {suggestedLanguages.map((suggestedLanguage) => (
                    <LanguageRow
                      key={suggestedLanguage.id}
                      language={suggestedLanguage}
                      onSelect={handleSelectLanguage}
                      selectedLanguageId={selectedLanguageId}
                    />
                  ))}
                </ItemGroup>
              </>
            ) : (
              <p className="yv:px-4 yv:py-8 yv:text-center yv:text-muted-foreground">
                {t('noRegionalLanguagesAvailable')}
              </p>
            )}
          </TabsContent>

          <TabsContent value="all" className="yv:overflow-y-auto yv:flex-1 yv:min-h-0">
            <h3 className="yv:bg-popover yv:px-4 yv:pb-2 yv:text-lg yv:font-bold">
              {t('allLanguagesHeading')}
            </h3>
            <ItemGroup className="yv:gap-1">
              {languages.map((language) => (
                <LanguageRow
                  key={language.id}
                  language={language}
                  onSelect={handleSelectLanguage}
                  selectedLanguageId={selectedLanguageId}
                />
              ))}
            </ItemGroup>
          </TabsContent>
        </Tabs>
      )}

      <section className="yv:bg-muted yv:border-s yv:border-muted yv:p-4">
        <div className="yv:grid yv:grid-cols-[1fr_auto] yv:gap-2">
          <InputGroup className="yv:bg-background yv:shadow-none yv:border-border">
            <InputGroupInput
              aria-label={t('languageSearchAriaLabel')}
              tabIndex={1}
              type="text"
              placeholder={t('searchPlaceholder')}
              dir="auto"
              value={languageSearchQuery}
              onChange={(e) => setLanguageSearchQuery(e.target.value)}
            />
            <InputGroupAddon>
              <SearchIcon className="yv:size-5 yv:text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </div>
      </section>
    </div>
  );
}
