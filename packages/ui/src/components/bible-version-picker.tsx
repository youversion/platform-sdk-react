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
  cloneElement,
  createContext,
  isValidElement,
  type MouseEvent,
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
import { LoaderIcon } from './icons/loader';
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
  languages: Pick<Language, 'id' | 'display_names' | 'speaking_population'>[];
  totalLanguages: number;
  selectedLanguageId: string;
  setSelectedLanguageId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  suggestedLanguages: Pick<Language, 'id' | 'display_names'>[];
  filteredVersions: BibleVersion[];
  filteredRecentVersions: RecentVersion[];
  isLanguagesOpen: boolean;
  setIsLanguagesOpen: (open: boolean) => void;
  recentVersions: RecentVersion[];
  addRecentVersion: (version: RecentVersion) => void;
  isPopoverOpen: boolean;
  setIsPopoverOpen: (open: boolean) => void;
  versionsLoading: boolean;
  onVersionPickerPress?: (data: BibleVersionPickerPressData) => void;
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
  languageId?: string;
  defaultLanguageId?: string;
  onLanguageChange?: (languageId: string) => void;
  background?: 'light' | 'dark';
  side?: 'top' | 'right' | 'bottom' | 'left';
  onVersionPickerPress?: (data: BibleVersionPickerPressData) => void;
  children?: ReactNode;
};

export type BibleVersionPickerPressData = {
  versionId: number;
  languageId: string;
};

export type BibleVersionPickerContentProps = {
  open?: boolean;
  onRequestClose?: () => void;
};

export type BibleLanguagePickerContentProps = {
  open?: boolean;
  onRequestClose?: () => void;
};

export type BibleVersionPickerLanguageTriggerProps = Omit<
  React.ComponentProps<typeof Button>,
  'children'
>;

function Root({
  versionId: controlledVersionId,
  onVersionChange,
  languageId: controlledLanguageId,
  defaultLanguageId,
  onLanguageChange,
  background,
  side = 'top',
  onVersionPickerPress,
  children,
}: RootProps) {
  const [versionId, setVersionIdState] = useControllableState({
    prop: controlledVersionId,
    defaultProp: controlledVersionId,
    onChange: onVersionChange,
  });

  const providerTheme = useTheme();
  const theme = background || providerTheme;

  const fallbackLanguageId =
    defaultLanguageId ||
    (typeof navigator !== 'undefined' && navigator.languages[0]?.split('-')[0]) ||
    'en';
  const [selectedLanguageId, setSelectedLanguageId] = useControllableState({
    prop: controlledLanguageId,
    defaultProp: fallbackLanguageId,
    onChange: onLanguageChange,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLanguagesOpen, setIsLanguagesOpen] = useState(false);
  const [recentVersions, setRecentVersions] = useState<RecentVersion[]>(getRecentVersions);
  const [isPopoverOpenRaw, setIsPopoverOpenRaw] = useState(false);
  const isPopoverOpen = onVersionPickerPress ? false : isPopoverOpenRaw;

  const setIsPopoverOpen = useCallback(
    (open: boolean) => {
      if (onVersionPickerPress) return;
      setIsPopoverOpenRaw(open);
      if (!open) {
        setSearchQuery('');
        setIsLanguagesOpen(false);
      }
    },
    [setSearchQuery, onVersionPickerPress],
  );

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

  const { versions, loading: versionsLoading } = useVersions(selectedLanguageId);
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

  // Suggested languages = browser preference languages first, then API country
  // languages (via country:'zz' which detects country by IP). Both lists are
  // filtered to only languages that have at least one Bible version (uniqueLanguages).
  // The API's order is preserved for country languages; browser order is preserved
  // for user languages. Duplicates are removed (first occurrence wins).
  const suggestedLanguages = useMemo(() => {
    // Extract language codes from browser (e.g., 'en-US' -> 'en')
    // Map over userLanguageCodes to preserve browser preference order
    const userLanguageCodes = (typeof navigator !== 'undefined' ? navigator.languages : []).map(
      (code) => code.split('-')[0]?.toLowerCase(),
    );
    const userLanguages = userLanguageCodes
      .map((code) => uniqueLanguages.find((language) => language.id === code))
      .filter((language) => language !== undefined);

    const uniqueLanguageIds = new Set(uniqueLanguages.map((l) => l.id));
    const orderedCountryLanguages = (countryLanguages?.data ?? []).filter((language) =>
      uniqueLanguageIds.has(language.id),
    );

    const combined = [...userLanguages, ...orderedCountryLanguages];

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
    filteredRecentVersions,
    isLanguagesOpen,
    setIsLanguagesOpen,
    recentVersions,
    addRecentVersion,
    isPopoverOpen,
    setIsPopoverOpen,
    versionsLoading,
    onVersionPickerPress,
  };

  if (onVersionPickerPress) {
    return (
      <BibleVersionPickerContext.Provider value={contextValue}>
        {children}
      </BibleVersionPickerContext.Provider>
    );
  }

  return (
    <BibleVersionPickerContext.Provider value={contextValue}>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        {children}
      </Popover>
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
  const { versionId, selectedLanguageId, background, onVersionPickerPress } =
    useBibleVersionPickerContext();
  const { version, loading } = useVersion(versionId);

  const content =
    typeof children === 'function'
      ? children({ version, loading })
      : children || (
          <Button variant={'secondary'} className="yv:cursor-pointer yv:font-bold yv:text-base">
            {version?.localized_abbreviation || 'Select'}
          </Button>
        );

  const handlePress = (event: MouseEvent<HTMLButtonElement>) => {
    props.onClick?.(event);
    if (!event.defaultPrevented) {
      onVersionPickerPress?.({ versionId, languageId: selectedLanguageId });
    }
  };

  if (onVersionPickerPress) {
    if (asChild && isValidElement<Record<string, unknown>>(content)) {
      return cloneElement(content, {
        'data-yv-sdk': true,
        'data-yv-theme': background,
        ...props,
        onClick: handlePress,
      });
    }

    return (
      <button type="button" data-yv-sdk data-yv-theme={background} {...props} onClick={handlePress}>
        {content}
      </button>
    );
  }

  return (
    <PopoverTrigger data-yv-sdk data-yv-theme={background} asChild={asChild} {...props}>
      {content}
    </PopoverTrigger>
  );
}

/**
 * @internal Advanced composition surface for SDK integrations.
 *
 * `onClick` is a DOM-local event handler. Expo DOM wrappers should expose a
 * top-level async native action prop and call it from an internal `onClick`
 * adapter that calls `event.preventDefault()` instead of passing native
 * callbacks through as React event handlers.
 */
export function BibleVersionPickerLanguageTrigger({
  'aria-label': ariaLabel = 'Select language',
  className,
  onClick,
  size = 'sm',
  variant = 'secondary',
  ...props
}: BibleVersionPickerLanguageTriggerProps): React.ReactElement {
  const {
    filteredVersions,
    filteredRecentVersions,
    setIsLanguagesOpen,
    selectedLanguageId,
    versionsLoading,
  } = useBibleVersionPickerContext();
  // Fetch the selected language details (may not be in the paginated languages list)
  const { language: selectedLanguage } = useLanguage(selectedLanguageId);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      setIsLanguagesOpen(true);
    }
  };

  return (
    <Button
      aria-label={ariaLabel}
      className={cn(
        'yv:ml-auto yv:bg-card yv:border yv:border-transparent yv:hover:bg-card yv:hover:border-border yv:max-w-40',
        className,
      )}
      size={size}
      onClick={handleClick}
      variant={variant}
      {...props}
    >
      <GlobeIcon className="yv:size-4" />
      <span className="yv:text-sm yv:font-medium yv:truncate">
        {selectedLanguage?.display_names?.en || selectedLanguage?.language}
      </span>
      <Badge
        variant="secondary"
        className="yv:h-5 yv:min-w-5 yv:rounded-full yv:px-1 yv:font-mono yv:tabular-nums"
      >
        {versionsLoading ? (
          <LoaderIcon className="yv:size-3 yv:animate-spin" />
        ) : (
          filteredVersions.length + filteredRecentVersions.length
        )}
      </Badge>
    </Button>
  );
}

function Content({ open, onRequestClose }: BibleVersionPickerContentProps = {}) {
  const {
    searchQuery,
    setSearchQuery,
    filteredVersions,
    filteredRecentVersions,
    versionId,
    setVersionId,
    addRecentVersion,
    versionsLoading,
    background,
    side,
    isLanguagesOpen,
    setIsLanguagesOpen,
    setIsPopoverOpen,
    onVersionPickerPress,
  } = useBibleVersionPickerContext();
  const wasOpenRef = useRef(open ?? false);

  const handleSelectVersion = (version: BibleVersion | RecentVersion) => {
    setVersionId(version.id);
    addRecentVersion({
      id: version.id,
      title: version.title,
      localized_abbreviation: version.localized_abbreviation,
      abbreviation: version.abbreviation,
    });
    setSearchQuery('');
    onRequestClose?.();
  };

  useEffect(() => {
    if (wasOpenRef.current && open === false) {
      setSearchQuery('');
      setIsLanguagesOpen(false);
    }
    wasOpenRef.current = open ?? false;
  }, [open, setIsLanguagesOpen, setSearchQuery]);

  if (onVersionPickerPress && open === undefined && !onRequestClose) {
    return null;
  }

  if (open === undefined && !onRequestClose) {
    return (
      <PopoverContent
        sideOffset={16}
        className="yv:h-[66svh]"
        heading={isLanguagesOpen ? 'Select Language' : 'Bible Versions'}
        headerLeading={
          isLanguagesOpen ? (
            <Button
              onClick={() => setIsLanguagesOpen(false)}
              variant="ghost"
              size="icon"
              className="yv:w-6 yv:h-6 yv:text-muted-foreground"
            >
              <ArrowLeftIcon className="yv:size-5" />
              <span className="yv:sr-only">Back to Bible versions</span>
            </Button>
          ) : null
        }
        headerChild={
          <BibleVersionPickerLanguageTrigger
            disabled={isLanguagesOpen}
            style={
              isLanguagesOpen ? { visibility: 'hidden', opacity: 0, pointerEvents: 'none' } : {}
            }
          />
        }
        theme={background}
        side={side}
      >
        <div className="yv:relative yv:min-h-0 yv:overflow-hidden">
          <div
            className={`yv:h-full yv:min-h-0 yv:overflow-hidden yv:transition-all yv:duration-300 yv:ease-out yv:motion-reduce:transition-none ${
              isLanguagesOpen
                ? 'yv:opacity-0 yv:pointer-events-none yv:blur-sm yv:scale-95'
                : 'yv:opacity-100 yv:pointer-events-auto yv:blur-none yv:scale-100'
            }`}
          >
            <Content onRequestClose={() => setIsPopoverOpen(false)} />
          </div>
          <div
            className={`yv:h-full yv:min-h-0 yv:overflow-hidden yv:absolute yv:inset-0 yv:transition-all yv:duration-300 yv:ease-out yv:motion-reduce:transition-none ${
              isLanguagesOpen
                ? 'yv:opacity-100 yv:pointer-events-auto yv:blur-none yv:scale-100'
                : 'yv:opacity-0 yv:pointer-events-none yv:blur-sm yv:scale-95'
            }`}
          >
            <LanguagePanel onRequestClose={() => setIsLanguagesOpen(false)} />
          </div>
        </div>
      </PopoverContent>
    );
  }

  return (
    <div
      className="yv:overflow-y-auto yv:h-full yv:flex yv:flex-col yv:transition-all yv:duration-300 yv:rounded-2xl yv:origin-center"
      data-yv-sdk
      data-yv-theme={background}
    >
      {/* Versions View */}
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
        {filteredVersions.length > 0 ? (
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
                    <ItemTitle className="yv:line-clamp-2 yv:text-left">{version.title}</ItemTitle>
                  </ItemContent>
                </button>
              </Item>
            ))}
          </ItemGroup>
        ) : versionsLoading ? (
          <div className="yv:w-full yv:flex yv:items-center yv:justify-center yv:py-8 yv:text-center yv:text-muted-foreground yv:text-sm">
            <LoaderIcon className="yv:size-6 yv:animate-spin yv:text-muted-foreground" />
          </div>
        ) : !filteredRecentVersions.length ? (
          <div className="yv:w-full yv:flex yv:items-center yv:justify-center yv:py-8 yv:text-center yv:text-muted-foreground yv:text-sm">
            No versions found
          </div>
        ) : null}
      </div>

      <section className="yv:bg-muted yv:border-s yv:border-muted yv:p-4">
        <div className="yv:grid yv:grid-cols-[1fr_auto] yv:gap-2">
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
        </div>
      </section>
    </div>
  );
}

function LanguagePanel({ onRequestClose }: BibleLanguagePickerContentProps = {}) {
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
  const {
    totalLanguages,
    selectedLanguageId,
    setSelectedLanguageId,
    suggestedLanguages,
    languages,
    background,
  } = useBibleVersionPickerContext();

  const handleSelectLanguage = (languageId: string) => {
    setSelectedLanguageId(languageId);
    onRequestClose?.();
  };

  return (
    <div
      className="yv:h-full yv:min-h-0 yv:overflow-hidden yv:flex yv:flex-col"
      data-yv-sdk
      data-yv-theme={background}
      data-open={open}
    >
      <Tabs
        className="yv:mt-4 yv:gap-4 yv:flex-1 yv:min-h-0 yv:flex yv:flex-col"
        defaultValue="suggested"
      >
        <TabsList className="yv:mx-4 yv:w-[calc(100%-4*var(--spacing)*2)]">
          <TabsTrigger className="yv:p-0" value="suggested">
            Suggested
          </TabsTrigger>
          <TabsTrigger className="yv:p-0" value="all">
            All ({totalLanguages})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggested" className="yv:overflow-y-auto yv:flex-1 yv:min-h-0">
          {suggestedLanguages.length > 0 ? (
            <>
              <h3 className="yv:bg-popover yv:px-4 yv:pb-2 yv:text-lg yv:font-bold">Regional</h3>
              <ItemGroup className="yv:gap-1">
                {suggestedLanguages.map((suggestedLanguage) => (
                  <Item
                    key={suggestedLanguage.id}
                    className={cn(
                      'yv:hover:bg-muted yv:rounded-[8px] yv:px-4',
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
                      <ItemContent className="yv:flex yv:flex-row yv:justify-between yv:items-center">
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
            </>
          ) : (
            <p className="yv:px-4 yv:py-8 yv:text-center yv:text-muted-foreground">
              No regional languages available
            </p>
          )}
        </TabsContent>

        <TabsContent value="all" className="yv:overflow-y-auto yv:flex-1 yv:min-h-0">
          <h3 className="yv:bg-popover yv:px-4 yv:pb-2 yv:text-lg yv:font-bold">All Languages</h3>
          <ItemGroup className="yv:gap-1">
            {languages.map((language) => (
              <Item
                key={language.id}
                className={cn(
                  'yv:hover:bg-muted yv:rounded-[8px] yv:px-4',
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
                  <ItemContent className="yv:flex yv:flex-row yv:justify-between yv:items-center">
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
  );
}

export const BibleVersionPicker = Object.assign({}, { Root, Trigger, Content });
export type BibleVersionPickerRootProps = RootProps;
