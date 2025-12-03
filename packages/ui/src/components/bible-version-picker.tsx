import { createContext, useContext, useState, useMemo, useRef, type ReactNode } from 'react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import {
  useFilteredVersions,
  useVersion,
  useVersions,
  useLanguages,
} from '@youversion/platform-react-hooks';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from './ui/popover';
import { Item, ItemGroup, ItemMedia, ItemContent, ItemTitle, ItemDescription } from './ui/item';
import type { BibleVersion } from '@youversion/platform-core';
import { Search, Globe, X as XIcon, ArrowLeft } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

type LanguageOption = {
  id: string;
  name: string;
  englishName: string;
};

type BibleVersionPickerContextType = {
  versionId: number;
  setVersionId: (versionId: number) => void;
  background: 'light' | 'dark';
  side: 'top' | 'right' | 'bottom' | 'left';
  languages: LanguageOption[];
  selectedLanguageId: string;
  setSelectedLanguageId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredVersions: BibleVersion[];
  isLanguagesOpen: boolean;
  setIsLanguagesOpen: (open: boolean) => void;
};

const BibleVersionPickerContext = createContext<BibleVersionPickerContextType | null>(null);

function useBibleVersionPickerContext() {
  const context = useContext(BibleVersionPickerContext);
  if (!context) {
    throw new Error('BibleVersionPicker components must be used within BibleVersionPicker.Root');
  }
  return context;
}

export type RootProps = {
  versionId: number;
  onVersionChange?: (versionId: number) => void;
  background?: 'light' | 'dark';
  side?: 'top' | 'right' | 'bottom' | 'left';
  children?: ReactNode;
};

function Root({
  versionId: controlledVersionId,
  onVersionChange,
  background = 'light',
  side = 'top',
  children,
}: RootProps) {
  const [versionId, setVersionIdState] = useControllableState({
    prop: controlledVersionId,
    defaultProp: controlledVersionId,
    onChange: onVersionChange,
  });

  const [selectedLanguageId, setSelectedLanguageId] = useState('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLanguagesOpen, setIsLanguagesOpen] = useState(false);

  // Fetch languages from hook with default country 'US'
  const { languages: hookLanguages } = useLanguages({ country: 'US' });

  // Fetch languages from hook, without duplicates.
  // Filtering has been added because the API's
  // have returned duplicate languages with the same ID.
  const languages = useMemo(() => {
    if (!hookLanguages?.data || hookLanguages.data.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const result: { id: string; englishName: string; name: string }[] = [];

    for (const lang of hookLanguages.data) {
      const id = lang.id || '';
      if (id && !seen.has(id)) {
        seen.add(id);
        result.push({
          id,
          englishName: lang.display_names?.en || lang.language,
          name: lang.display_names?.[lang.id] || lang.language,
        });
      }
    }

    return result;
  }, [hookLanguages?.data]);

  const { versions } = useVersions(selectedLanguageId);
  const filteredVersions = useFilteredVersions(
    versions?.data || [],
    searchQuery,
    selectedLanguageId,
  );

  const contextValue: BibleVersionPickerContextType = {
    versionId,
    setVersionId: setVersionIdState,
    background,
    side,
    languages,
    selectedLanguageId,
    setSelectedLanguageId,
    searchQuery,
    setSearchQuery,
    filteredVersions,
    isLanguagesOpen,
    setIsLanguagesOpen,
  };

  return (
    <BibleVersionPickerContext.Provider value={contextValue}>
      <Popover>{children}</Popover>
    </BibleVersionPickerContext.Provider>
  );
}

export type BibleVersionPickerTriggerProps = Omit<
  React.ComponentProps<typeof PopoverTrigger>,
  'children'
> & {
  children?:
    | React.ReactNode
    | ((props: { version: BibleVersion | null; loading: boolean }) => React.ReactNode);
};

function Trigger({ asChild = true, children, ...props }: BibleVersionPickerTriggerProps) {
  const { versionId, background } = useBibleVersionPickerContext();
  const { version, loading } = useVersion(versionId);

  const content =
    typeof children === 'function'
      ? children({ version, loading })
      : children || (
          <Button
            variant={background === 'light' ? 'outline' : 'default'}
            className="yv:cursor-pointer"
          >
            {version?.localized_abbreviation || 'Select'}
          </Button>
        );

  return (
    <PopoverTrigger asChild={asChild} {...props}>
      {content}
    </PopoverTrigger>
  );
}

function Content() {
  const {
    searchQuery,
    setSearchQuery,
    filteredVersions,
    versionId,
    setVersionId,
    background,
    side,
    setIsLanguagesOpen,
    isLanguagesOpen,
    languages,
    selectedLanguageId,
    setSelectedLanguageId,
  } = useBibleVersionPickerContext();
  const closeRef = useRef<HTMLButtonElement>(null);

  const handleSelectLanguage = (languageId: string) => {
    setSelectedLanguageId(languageId);
    setIsLanguagesOpen(false);
  };

  const handleSelectVersion = (versionId: number) => {
    setVersionId(versionId);
    setIsLanguagesOpen(false);
    closeRef.current?.click();
  };

  return (
    <PopoverContent
      data-yv-sdk
      data-yv-theme={background === 'dark' ? 'dark' : 'light'}
      side={side}
      className="yv:flex yv:flex-col yv:bg-background yv:p-0 yv:h-[66vh] yv:max-h-[66vh] yv:w-96 yv:sm:w-sm yv:overflow-hidden yv:rounded-2xl yv:border-0 yv:shadow-lg"
    >
      {/* Versions View */}
      <div
        className={`yv:h-[66vh] yv:absolute yv:inset-0 yv:flex yv:flex-col yv:transition-all yv:duration-300 yv:rounded-2xl yv:origin-center ${
          isLanguagesOpen
            ? 'yv:opacity-0 yv:pointer-events-none yv:blur-sm yv:scale-95'
            : 'yv:opacity-100 yv:pointer-events-auto yv:blur-none yv:scale-100'
        }`}
      >
        <section className="yv:bg-muted yv:py-3 yv:w-full yv:rounded-t-2xl yv:px-4 yv:border-b yv:border-border yv:flex yv:flex-row yv:justify-between yv:items-center">
          <div className="yv:flex yv:flex-col">
            <h2 className="yv:font-bold yv:text-base yv:line-clamp-1">Bible Versions</h2>
          </div>
          <div className="yv:flex yv:items-center yv:gap-2">
            <Button
              aria-label="Select language"
              className="yv:bg-card yv:border yv:border-transparent yv:hover:bg-card yv:hover:border-border"
              size="sm"
              onClick={() => setIsLanguagesOpen(true)}
              variant="secondary"
            >
              <Globe size={16} />
              <span className="yv:text-sm yv:font-medium yv:line-clamp-1">
                {languages.find((language) => language.id === selectedLanguageId)?.englishName}
              </span>
              <Badge
                variant="secondary"
                className="yv:h-5 yv:min-w-5 yv:rounded-full yv:px-1 yv:font-mono yv:tabular-nums"
              >
                {filteredVersions.length}
              </Badge>
            </Button>

            <PopoverClose asChild>
              <Button
                ref={closeRef}
                variant="ghost"
                size="icon"
                className="yv:w-8 yv:h-8 yv:text-muted-foreground"
              >
                <XIcon size={16} />
                <span className="yv:sr-only">Close version selector</span>
              </Button>
            </PopoverClose>
          </div>
        </section>

        <div className="yv:flex-1 yv:overflow-y-auto yv:py-2">
          {filteredVersions && filteredVersions.length > 0 ? (
            <ItemGroup data-testid="version-list">
              {filteredVersions.map((version: BibleVersion) => (
                <Item
                  key={version.abbreviation}
                  className={cn(
                    'yv:hover:bg-muted yv:rounded-[8px]',
                    versionId === version.id ? 'yv:bg-muted' : '',
                  )}
                  size="sm"
                  variant="default"
                  role="listitem"
                  asChild
                  aria-label={version.title}
                >
                  <button
                    type="button"
                    className="yv:w-full"
                    onClick={() => handleSelectVersion(version.id)}
                  >
                    <ItemMedia
                      variant="icon"
                      className="yv:rounded-[8px] yv:size-12 yv:border-border yv:p-1 yv:flex yv:flex-col yv:justify-center"
                    >
                      {(() => {
                        const match = /^(.+?)(\d+)$/.exec(version.local_abbreviation) || [];
                        const prefix = match[1] || version.local_abbreviation;
                        const digits = match[2];
                        return (
                          <div className="yv:font-serif yv:text-sm yv:leading-none yv:font-bold yv:text-center">
                            <div>{prefix}</div>
                            {digits && <div>{digits}</div>}
                          </div>
                        );
                      })()}
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="yv:line-clamp-2 yv:text-left">
                        {version.title}
                      </ItemTitle>
                    </ItemContent>
                  </button>
                </Item>
              ))}
            </ItemGroup>
          ) : (
            <div className="yv:w-full yv:flex yv:items-center yv:justify-center yv:py-8 yv:text-center yv:text-muted-foreground yv:text-sm">
              No versions found
            </div>
          )}
        </div>

        <section className="yv:bg-muted yv:border-t yv:border-border yv:p-4 yv:w-full yv:rounded-b-2xl yv:flex yv:gap-3">
          <div className="yv:flex-1 yv:relative">
            <Search
              size={13}
              className="yv:absolute yv:left-3 yv:top-1/2 yv:-translate-y-1/2 yv:text-muted-foreground"
            />
            <Input
              className="yv:rounded-3xl yv:bg-background yv:pl-9 yv:py-3 yv:border-border"
              type="text"
              placeholder="Search"
              aria-label="Search Versions"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </section>
      </div>

      {/* Languages View */}
      <div
        className={`yv:h-[66vh] yv:absolute yv:inset-0 yv:flex yv:flex-col yv:transition-all yv:duration-300 yv:rounded-2xl yv:origin-center ${
          isLanguagesOpen
            ? 'yv:opacity-100 yv:pointer-events-auto yv:blur-none yv:scale-100'
            : 'yv:opacity-0 yv:pointer-events-none yv:blur-sm yv:scale-95'
        }`}
      >
        <section className="yv:bg-muted yv:py-3 yv:w-full yv:rounded-t-2xl yv:px-4 yv:border-b yv:border-border yv:grid yv:grid-cols-[auto_1fr] yv:gap-2 yv:items-center">
          <Button
            onClick={() => setIsLanguagesOpen(false)}
            variant="ghost"
            size="icon"
            className="yv:w-8 yv:h-8 yv:text-muted-foreground"
          >
            <ArrowLeft size={16} />
            <span className="yv:sr-only">Close Language selector</span>
          </Button>
          <h2 className="yv:font-bold yv:text-base">Select Language</h2>
        </section>

        <ItemGroup className="yv:overflow-y-auto yv:py-2">
          {languages.map((language) => (
            <Item
              key={language.id}
              className="yv:hover:bg-muted yv:rounded-[8px]"
              size="sm"
              role="listitem"
              aria-label={language.englishName}
              asChild
            >
              <button className="yv:w-full" onClick={() => handleSelectLanguage(language.id)}>
                <ItemContent>
                  <ItemTitle className="yv:line-clamp-2">{language.englishName}</ItemTitle>
                </ItemContent>
                <ItemContent className="flex-none text-center">
                  <ItemDescription>{language.name}</ItemDescription>
                </ItemContent>
              </button>
            </Item>
          ))}
        </ItemGroup>
      </div>
    </PopoverContent>
  );
}

export const BibleVersionPicker = Object.assign({}, { Root, Trigger, Content });
export type BibleVersionPickerRootProps = RootProps;
