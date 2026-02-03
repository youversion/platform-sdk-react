import { useControllableState } from '@radix-ui/react-use-controllable-state';
import type { BibleVersion, Language } from '@youversion/platform-core';
import {
  useFilteredVersions,
  useLanguage,
  useLanguages,
  useTheme,
  useVersion,
  useVersions,
} from '@youversion/platform-react-hooks';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon } from './icons/arrow-left';
import { GlobeIcon } from './icons/globe';
import { SearchIcon } from './icons/search';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from './ui/input-group';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from './ui/item';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

export const RECENT_VERSIONS_KEY = 'youversion-platform:picker:recent-versions';
const MAX_RECENT_VERSIONS = 3;

type RecentVersion = Pick<BibleVersion, 'id' | 'title' | 'localized_abbreviation' | 'abbreviation'>;

function getRecentVersions(): RecentVersion[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_VERSIONS_KEY);
    const recentVersions: RecentVersion[] = stored ? (JSON.parse(stored) as RecentVersion[]) : [];
    return recentVersions;
  } catch {
    return [];
  }
}

function saveRecentVersions(versions: RecentVersion[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RECENT_VERSIONS_KEY, JSON.stringify(versions));
}

// Displays a version abbreviation (e.g., "NIV", "KJV2") centered within a fixed-size icon.
// Dynamically scales the font size to fit the text within the container with padding.
function VersionAbbreviationIcon({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefixRef = useRef<HTMLDivElement>(null);
  const [prefixSize, setPrefixSize] = useState(20);

  // Split abbreviation into letters and numbers (e.g., "KJV2" → "KJV", "2")
  const match = /^(.+?)(\d+)$/.exec(text) || [];
  const prefix = match[1] || text;
  const digits = match[2];

  useEffect(() => {
    const container = containerRef.current;
    const prefixElement = prefixRef.current;
    if (!container || !prefixElement) return;

    // Calculate the maximum font size that fits the text within container bounds
    const calculateSize = (element: HTMLElement | null) => {
      if (!element) return 20;

      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      // Target 70% of width for horizontal padding, max 40% height for vertical spacing
      const targetWidth = containerWidth * 0.7;
      const maxHeight = containerHeight * 0.4;

      let currentSize = 20;
      let ratio = 1;

      // Iteratively converge on the optimal size (5 iterations sufficient for convergence)
      for (let i = 0; i < 5; i++) {
        element.style.fontSize = `${currentSize}px`;
        const currentWidth = element.scrollWidth;
        const currentHeight = element.offsetHeight;

        if (currentWidth > 0) {
          const widthRatio = targetWidth / currentWidth;
          const heightRatio = maxHeight / currentHeight;
          // Use the more restrictive constraint (width or height)
          ratio = Math.min(widthRatio, heightRatio);
          currentSize = currentSize * ratio;
        }
      }

      // Ensure minimum readable size of 12px
      return Math.max(12, currentSize);
    };

    const updateSizes = () => {
      const newPrefixSize = calculateSize(prefixElement);
      setPrefixSize(newPrefixSize);
    };

    // Recalculate when container size changes (e.g., window resize, theme switch)
    const resizeObserver = new ResizeObserver(updateSizes);
    resizeObserver.observe(container);
    updateSizes();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="yv:flex yv:flex-col yv:w-full yv:h-full yv:px-2 yv:font-serif yv:leading-none yv:font-bold yv:items-center yv:justify-center"
    >
      <div ref={prefixRef} className="yv:whitespace-nowrap" style={{ fontSize: `${prefixSize}px` }}>
        {prefix}
      </div>
      {digits && (
        <div className="yv:whitespace-nowrap" style={{ fontSize: `${prefixSize}px` }}>
          {digits}
        </div>
      )}
    </div>
  );
}

type BibleVersionPickerContextType = {
  versionId: number;
  setVersionId: (versionId: number) => void;
  background: 'light' | 'dark';
  side: 'top' | 'right' | 'bottom' | 'left';
  languages: Pick<Language, 'id' | 'display_names'>[];
  totalLanguages: number;
  selectedLanguageId: string;
  setSelectedLanguageId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  suggestedLanguages: Pick<Language, 'id' | 'display_names'>[];
  filteredVersions: BibleVersion[];
  isLanguagesOpen: boolean;
  setIsLanguagesOpen: (open: boolean) => void;
  recentVersions: RecentVersion[];
  addRecentVersion: (version: RecentVersion) => void;
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
  background,
  side = 'top',
  children,
}: RootProps) {
  const [versionId, setVersionIdState] = useControllableState({
    prop: controlledVersionId,
    defaultProp: controlledVersionId,
    onChange: onVersionChange,
  });

  const providerTheme = useTheme();
  const theme = background || providerTheme;

  const [selectedLanguageId, setSelectedLanguageId] = useState(
    (typeof navigator !== 'undefined' && navigator.languages[0]?.split('-')[0]) || 'en',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isLanguagesOpen, setIsLanguagesOpen] = useState(false);
  const [recentVersions, setRecentVersions] = useState<RecentVersion[]>(getRecentVersions);

  const addRecentVersion = useCallback((version: RecentVersion) => {
    setRecentVersions((prev) => {
      const filtered = prev.filter((v) => v.id !== version.id);
      const updated = [version, ...filtered].slice(0, MAX_RECENT_VERSIONS);
      saveRecentVersions(updated);
      return updated;
    });
  }, []);

  const { languages } = useLanguages({
    fields: ['id', 'display_names', 'speaking_population'],
    page_size: '*',
  });

  const { versions } = useVersions(selectedLanguageId);
  const { versions: versionsLanguageInfo } = useVersions('*', undefined, {
    fields: ['id', 'language_tag'],
    page_size: '*',
  });
  const filteredVersions = useFilteredVersions(
    versions?.data || [],
    searchQuery,
    selectedLanguageId,
    recentVersions,
  );

  const getLanguageDisplayName = useCallback(
    (language: Pick<Language, 'id' | 'display_names'>) => {
      return (
        language.display_names?.[selectedLanguageId] || language.display_names?.en || language.id
      );
    },
    [selectedLanguageId],
  );

  const uniqueLanguages = useMemo(() => {
    const versionLanguages =
      versionsLanguageInfo?.data.map((version) => version.language_tag) || [];
    if (languages?.data) {
      const unique = [
        ...new Map(
          languages.data
            .filter(
              (language) => language.display_names?.en && versionLanguages.includes(language.id),
            )
            .map((language) => [language.id, language]),
        ).values(),
      ];
      return unique.sort((a, b) =>
        getLanguageDisplayName(a).localeCompare(getLanguageDisplayName(b)),
      );
    }
    return [];
  }, [languages, versionsLanguageInfo?.data, getLanguageDisplayName]);

  // pass zz to get the country languages based on IP Address
  const { languages: countryLanguages } = useLanguages({
    country: 'zz',
    fields: ['id', 'display_names'],
    page_size: '*',
  });

  const suggestedLanguages = useMemo(() => {
    const countryLanguagesIds = countryLanguages?.data.map((language) => language.id) || [];

    // Extract language codes from browser (e.g., 'en-US' -> 'en')
    // Map over userLanguageCodes to preserve browser preference order
    const userLanguageCodes = (typeof navigator !== 'undefined' ? navigator.languages : []).map(
      (code) => code.split('-')[0]?.toLowerCase(),
    );
    const userLanguages = userLanguageCodes
      .map((code) => uniqueLanguages.find((language) => language.id === code))
      .filter((language) => language !== undefined);

    const filteredCountryLanguages: Language[] =
      uniqueLanguages.filter((language) => countryLanguagesIds.includes(language.id)) || [];
    const sortedCountryLanguages = filteredCountryLanguages.sort(
      (a, b) => (b.speaking_population || 0) - (a.speaking_population || 0),
    );

    const combined = [...userLanguages, ...sortedCountryLanguages];

    return [...new Map(combined.map((lang) => [lang.id, lang])).values()];
  }, [uniqueLanguages, countryLanguages]);

  const contextValue: BibleVersionPickerContextType = {
    versionId,
    setVersionId: setVersionIdState,
    background: theme,
    side,
    languages: uniqueLanguages,
    totalLanguages: uniqueLanguages.length || 0,
    selectedLanguageId,
    setSelectedLanguageId,
    searchQuery,
    setSearchQuery,
    suggestedLanguages,
    filteredVersions,
    isLanguagesOpen,
    setIsLanguagesOpen,
    recentVersions,
    addRecentVersion,
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
          <Button variant={'secondary'} className="yv:cursor-pointer yv:font-bold yv:text-base">
            {version?.localized_abbreviation || 'Select'}
          </Button>
        );

  return (
    <PopoverTrigger data-yv-sdk data-yv-theme={background} asChild={asChild} {...props}>
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
    totalLanguages,
    selectedLanguageId,
    setSelectedLanguageId,
    recentVersions,
    addRecentVersion,
    suggestedLanguages,
    languages,
  } = useBibleVersionPickerContext();
  const providerTheme = useTheme();
  const theme = background || providerTheme;
  const closeRef = useRef<HTMLButtonElement>(null);

  const filteredRecentVersions = useMemo(() => {
    if (!searchQuery.trim()) return recentVersions;
    const query = searchQuery.trim().toLowerCase();
    return recentVersions.filter(
      (v) =>
        v.title?.toLowerCase().includes(query) ||
        v.localized_abbreviation?.toLowerCase().includes(query) ||
        v.abbreviation?.toLowerCase().includes(query),
    );
  }, [recentVersions, searchQuery]);
  // Fetch the selected language details (may not be in the paginated languages list)
  const { language: selectedLanguage } = useLanguage(selectedLanguageId);

  const handleSelectLanguage = (languageId: string) => {
    setSelectedLanguageId(languageId);
    setIsLanguagesOpen(false);
  };

  const handleSelectVersion = (version: BibleVersion | RecentVersion) => {
    setVersionId(version.id);
    addRecentVersion({
      id: version.id,
      title: version.title,
      localized_abbreviation: version.localized_abbreviation,
      abbreviation: version.abbreviation,
    });
    setIsLanguagesOpen(false);
    closeRef.current?.click();
  };

  function LanguagePicker() {
    return (
      <div className="yv:ml-auto">
        <Button
          aria-label="Select language"
          className="yv:bg-card yv:border yv:border-transparent yv:hover:bg-card yv:hover:border-border yv:max-w-42"
          size="sm"
          onClick={() => setIsLanguagesOpen(true)}
          variant="secondary"
        >
          <GlobeIcon className="yv:size-4" />
          <span className="yv:text-sm yv:font-medium yv:truncate">
            {selectedLanguage?.display_names?.en || selectedLanguage?.language}
          </span>
          <Badge
            variant="secondary"
            className="yv:h-5 yv:min-w-5 yv:rounded-full yv:px-1 yv:font-mono yv:tabular-nums"
          >
            {filteredVersions.length + filteredRecentVersions.length}
          </Badge>
        </Button>
      </div>
    );
  }

  return (
    <PopoverContent
      className="yv:min-h-[500px]"
      heading="Bible Versions"
      headerChild={<LanguagePicker />}
      theme={theme}
      side={side}
    >
      {/* Versions View */}
      <div
        className={`yv:h-full yv:flex yv:flex-col yv:overflow-hidden yv:transition-all yv:duration-300 yv:rounded-2xl yv:origin-center ${
          isLanguagesOpen
            ? 'yv:opacity-0 yv:pointer-events-none yv:blur-sm yv:scale-95'
            : 'yv:opacity-100 yv:pointer-events-auto yv:blur-none yv:scale-100'
        }`}
      >
        <div className="yv:flex-1 yv:overflow-y-auto yv:py-2">
          {/* Recent Versions */}
          {filteredRecentVersions.length > 0 && (
            <>
              <h2 className="yv:px-4 yv:py-2 yv:text-lg yv:font-bold">Recently Used Versions</h2>
              <ItemGroup data-testid="recent-version-list">
                {filteredRecentVersions.map((version) => (
                  <Item
                    key={`recent-${version.id}`}
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
                      onClick={() => handleSelectVersion(version)}
                    >
                      <ItemMedia
                        variant="icon"
                        className="yv:rounded-[8px] yv:size-12 yv:border-border yv:flex yv:flex-col yv:justify-center yv:items-center"
                      >
                        <VersionAbbreviationIcon text={version.localized_abbreviation} />
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
            </>
          )}
          {/* All Versions */}
          {filteredVersions && filteredVersions.length > 0 ? (
            <ItemGroup data-testid="version-list">
              <h3 className="yv:px-4 yv:py-2 yv:font-bold">All Versions</h3>
              {filteredVersions.map((version: BibleVersion) => (
                <Item
                  key={version.id}
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
                    onClick={() => handleSelectVersion(version)}
                  >
                    <ItemMedia
                      variant="icon"
                      className="yv:rounded-[8px] yv:size-12 yv:border-border yv:flex yv:flex-col yv:justify-center yv:items-center"
                    >
                      <VersionAbbreviationIcon text={version.localized_abbreviation} />
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
          ) : null}
          {!filteredVersions.length && !filteredRecentVersions.length ? (
            <div className="yv:w-full yv:flex yv:items-center yv:justify-center yv:py-8 yv:text-center yv:text-muted-foreground yv:text-sm">
              No versions found
            </div>
          ) : null}
        </div>
        <section className="yv:bg-muted yv:border-s yv:border-muted yv:p-4">
          <InputGroup className="yv:bg-background yv:shadow-none yv:border-border">
            <InputGroupInput
              tabIndex={1}
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            ></InputGroupInput>
            <InputGroupAddon>
              <SearchIcon className="yv:size-5 yv:text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </section>
      </div>

      {/* Languages View */}
      <div
        className={`yv:h-full yv:absolute yv:inset-0 yv:flex yv:flex-col yv:transition-all yv:duration-300 yv:rounded-2xl yv:origin-center ${
          isLanguagesOpen
            ? 'yv:opacity-100 yv:pointer-events-auto yv:blur-none yv:scale-100'
            : 'yv:opacity-0 yv:pointer-events-none yv:blur-sm yv:scale-95'
        }`}
      >
        <section className="yv:bg-muted yv:py-3 yv:w-full yv:rounded-t-2xl yv:border-b yv:border-border yv:grid yv:grid-cols-[auto_1fr] yv:gap-2 yv:items-center">
          <Button
            onClick={() => setIsLanguagesOpen(false)}
            variant="ghost"
            size="icon"
            className="yv:w-8 yv:h-8 yv:text-muted-foreground"
          >
            <ArrowLeftIcon className="yv:size-4" />
            <span className="yv:sr-only">Close Language selector</span>
          </Button>
          <h2 className="yv:font-bold yv:text-base">Select Language</h2>
        </section>

        <Tabs
          className="yv:mt-6 yv:gap-4 yv:flex-1 yv:min-h-0 yv:flex yv:flex-col yv:px-4"
          defaultValue="suggested"
        >
          <TabsList className="yv:w-full">
            <TabsTrigger className="yv:p-0" value="suggested">
              Suggested
            </TabsTrigger>
            <TabsTrigger className="yv:p-0" value="all">
              All ({totalLanguages})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suggested" className="yv:overflow-y-auto yv:flex-1 yv:min-h-0">
            <ItemGroup className="yv:gap-1">
              <h3 className="yv:text-xl yv:font-bold yv:sticky yv:top-0 yv:z-10 yv:bg-popover yv:mb-2">
                Regional
              </h3>
              {suggestedLanguages.map((suggestedLanguage) => (
                <Item
                  key={suggestedLanguage.id}
                  className={cn(
                    'yv:hover:bg-muted yv:rounded-[8px] yv:px-1',
                    selectedLanguageId === suggestedLanguage.id ? 'yv:bg-muted' : '',
                  )}
                  size="sm"
                  role="listitem"
                  aria-label={suggestedLanguage.display_names?.en}
                  asChild
                >
                  <Button
                    className="yv:w-full yv:h-auto"
                    onClick={() => handleSelectLanguage(suggestedLanguage.id)}
                    type="button"
                    variant="ghost"
                  >
                    <ItemContent className="yv:flex yv:flex-row yv:justify-between yv:items-center yv:h-10 yv:overflow-hidden">
                      <ItemTitle className="yv:text-start yv:line-clamp-2 yv:min-w-0 yv:flex-1 yv:truncate">
                        {suggestedLanguage.display_names?.en}
                      </ItemTitle>
                      <ItemDescription className="yv:shrink-0">
                        {suggestedLanguage.display_names?.[suggestedLanguage.id]}
                      </ItemDescription>
                    </ItemContent>
                  </Button>
                </Item>
              ))}
            </ItemGroup>
          </TabsContent>
          <TabsContent value="all" className="yv:overflow-y-auto yv:flex-1 yv:min-h-0">
            <h3 className="yv:text-xl yv:font-bold yv:sticky yv:top-0 yv:z-10 yv:bg-popover yv:mb-2">
              All Languages
            </h3>
            <ItemGroup className="yv:py-2 yv:gap-1 yv:overflow-x-hidden">
              {languages.map((language) => (
                <Item
                  key={language.id}
                  className={cn(
                    'yv:hover:bg-muted yv:rounded-[8px] yv:px-1',
                    selectedLanguageId === language.id ? 'yv:bg-muted' : '',
                  )}
                  size="sm"
                  role="listitem"
                  aria-label={language.display_names?.en}
                  asChild
                >
                  <Button
                    className="yv:w-full yv:h-auto"
                    onClick={() => handleSelectLanguage(language.id)}
                    type="button"
                    variant="ghost"
                  >
                    <ItemContent className="yv:flex yv:flex-row yv:justify-between yv:items-center yv:h-10 yv:overflow-hidden">
                      <ItemTitle className="yv:text-start yv:line-clamp-2 yv:truncate yv:min-w-0 yv:max-w-2/3 yv:flex-1">
                        {language.display_names?.en}
                      </ItemTitle>
                      <ItemDescription className="yv:text-end yv:shrink-0 yv:max-w-1/3">
                        {language.display_names?.[language.id]}
                      </ItemDescription>
                    </ItemContent>
                  </Button>
                </Item>
              ))}
            </ItemGroup>
          </TabsContent>
        </Tabs>
      </div>
    </PopoverContent>
  );
}

export const BibleVersionPicker = Object.assign({}, { Root, Trigger, Content });
export type BibleVersionPickerRootProps = RootProps;
