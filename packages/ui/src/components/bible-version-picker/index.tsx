'use client';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { YvComponentStyles } from '@/lib/yv-styles-components';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import {
  getLocalStorage,
  isUsableBibleVersion,
  setStorageItem,
  type BibleVersion,
  type Language,
} from '@youversion/platform-core';
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
  useMemo,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import { GlobeIcon } from '../icons/globe';
import { LoaderIcon } from '../icons/loader';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useInterfaceDirection } from '@/lib/direction';
import { LanguageBackButton, LanguagePanel, LanguageSearchButton } from './language-panel';
import { VersionList } from './version-list';

export { BibleLanguagePickerContent } from './language-panel';

export const RECENT_VERSIONS_KEY = 'youversion-platform:picker:recent-versions';
const MAX_RECENT_VERSIONS = 3;

export type RecentVersion = Pick<
  BibleVersion,
  'id' | 'title' | 'localized_abbreviation' | 'abbreviation' | 'organization_id'
>;

type TriggerElementProps = React.HTMLAttributes<HTMLButtonElement> & {
  'data-yv-sdk'?: boolean;
  'data-yv-theme'?: string;
};

type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && Object.prototype.toString.call(value) === '[object Object]';
}

function isRecentVersionText(value: JsonValue | undefined): value is string {
  return Object.prototype.toString.call(value) === '[object String]';
}

function isRecentVersion(item: JsonValue): item is RecentVersion {
  if (!isJsonObject(item)) {
    return false;
  }
  return (
    Number.isFinite(item.id) &&
    isRecentVersionText(item.title) &&
    isRecentVersionText(item.localized_abbreviation)
  );
}

function parseRecentVersions(raw: string): RecentVersion[] {
  let parsed: JsonValue;
  try {
    // SAFETY: JSON.parse returns any. isRecentVersion checks each field
    // before the list is used.
    parsed = JSON.parse(raw) as JsonValue;
  } catch {
    return [];
  }
  if (!Array.isArray(parsed) || !parsed.every(isRecentVersion)) return [];
  return parsed;
}

function getRecentVersions(): RecentVersion[] {
  const stored = getLocalStorage()?.getItem(RECENT_VERSIONS_KEY);
  if (!stored) return [];
  return parseRecentVersions(stored);
}

function saveRecentVersions(versions: RecentVersion[]): void {
  setStorageItem(getLocalStorage(), RECENT_VERSIONS_KEY, JSON.stringify(versions));
}

export type LanguageListItem = Pick<Language, 'id' | 'display_names'> & {
  language?: string;
};

function filterLanguagesBySearch(languages: LanguageListItem[], query: string): LanguageListItem[] {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) return languages;

  return languages.filter((language) => {
    if (language.id.toLowerCase().includes(trimmedQuery)) return true;
    if (language.language?.toLowerCase().includes(trimmedQuery)) return true;

    return Object.values(language.display_names ?? {}).some((name) =>
      name.toLowerCase().includes(trimmedQuery),
    );
  });
}

export type PickerView = 'versions' | 'languages' | 'languageSearch';

type BibleVersionPickerContextType = {
  versionId: number;
  setVersionId: (versionId: number) => void;
  background: 'light' | 'dark';
  side: 'top' | 'right' | 'bottom' | 'left';
  languages: Pick<Language, 'id' | 'display_names' | 'speaking_population'>[];
  totalLanguages: number;
  totalVersions: number;
  selectedLanguageId: string;
  setSelectedLanguageId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  languageSearchQuery: string;
  setLanguageSearchQuery: (query: string) => void;
  filteredLanguages: LanguageListItem[];
  isLoadingLanguages: boolean;
  closeLanguagePanel: () => void;
  closeLanguageSearch: () => void;
  resetLanguageSearch: () => void;
  suggestedLanguages: Pick<Language, 'id' | 'display_names'>[];
  filteredVersions: BibleVersion[];
  filteredRecentVersions: RecentVersion[];
  view: PickerView;
  setView: (view: PickerView) => void;
  headerOwnsChrome: boolean;
  recentVersions: RecentVersion[];
  addRecentVersion: (version: RecentVersion) => void;
  isPopoverOpen: boolean;
  setIsPopoverOpen: (open: boolean) => void;
  versionsLoading: boolean;
  onVersionPickerPress?: (data: BibleVersionPickerPressData) => void;
};

const BibleVersionPickerContext = createContext<BibleVersionPickerContextType | null>(null);

export function useBibleVersionPickerContext(): BibleVersionPickerContextType {
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
    defaultLanguageId || globalThis.navigator?.languages?.[0]?.split('-')[0] || 'en';
  const [selectedLanguageId, setSelectedLanguageId] = useControllableState({
    prop: controlledLanguageId,
    defaultProp: fallbackLanguageId,
    onChange: onLanguageChange,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [languageSearchQuery, setLanguageSearchQuery] = useState('');
  const [view, setView] = useState<PickerView>('versions');
  const [recentVersions, setRecentVersions] = useState<RecentVersion[]>(getRecentVersions);
  const [isPopoverOpenRaw, setIsPopoverOpenRaw] = useState(false);
  const isPopoverOpen = onVersionPickerPress ? false : isPopoverOpenRaw;

  const resetLanguageSearch = useCallback(() => {
    setLanguageSearchQuery('');
  }, []);

  const closeLanguagePanel = useCallback(() => {
    setLanguageSearchQuery('');
    setView('versions');
  }, []);

  const closeLanguageSearch = useCallback(() => {
    setLanguageSearchQuery('');
    setView('languages');
  }, []);

  const setIsPopoverOpen = useCallback(
    (open: boolean) => {
      if (onVersionPickerPress) return;
      setIsPopoverOpenRaw(open);
      if (!open) {
        setSearchQuery('');
        setLanguageSearchQuery('');
        setView('versions');
      }
    },
    [onVersionPickerPress],
  );

  const addRecentVersion = useCallback((version: RecentVersion) => {
    setRecentVersions((prev) => {
      const filtered = prev.filter((v) => v.id !== version.id);
      const updated = [version, ...filtered].slice(0, MAX_RECENT_VERSIONS);
      saveRecentVersions(updated);
      return updated;
    });
  }, []);

  const { languages, loading: languagesLoading } = useLanguages({
    fields: ['id', 'display_names', 'speaking_population'],
    page_size: '*',
  });

  const { versions, loading: versionsLoading } = useVersions(selectedLanguageId);
  const { versions: versionsLanguageInfo, loading: versionsLanguageInfoLoading } = useVersions(
    '*',
    undefined,
    {
      fields: ['id', 'language_tag'],
      page_size: '*',
    },
  );
  const isLoadingLanguages = languagesLoading || versionsLanguageInfoLoading;
  const filteredVersions = useFilteredVersions(
    versions?.data || [],
    searchQuery,
    selectedLanguageId,
    recentVersions,
  );

  const languageTagByVersionId = useMemo(() => {
    const tags = new Map<number, string>();
    for (const version of versionsLanguageInfo?.data ?? []) {
      tags.set(version.id, version.language_tag);
    }
    return tags;
  }, [versionsLanguageInfo?.data]);

  const filteredRecentVersions = useMemo(() => {
    const matching = !searchQuery.trim()
      ? recentVersions
      : recentVersions.filter((v) => {
          const query = searchQuery.trim().toLowerCase();
          return (
            v.title?.toLowerCase().includes(query) ||
            v.localized_abbreviation?.toLowerCase().includes(query) ||
            v.abbreviation?.toLowerCase().includes(query)
          );
        });

    return matching.filter((version) =>
      isUsableBibleVersion({
        id: version.id,
        languageTag: languageTagByVersionId.get(version.id),
      }),
    );
  }, [recentVersions, searchQuery, languageTagByVersionId]);

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
    const userLanguageCodes = (globalThis.navigator?.languages ?? []).map((code) =>
      code.split('-')[0]?.toLowerCase(),
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

  const filteredLanguages = filterLanguagesBySearch(uniqueLanguages, languageSearchQuery);

  const contextValue: BibleVersionPickerContextType = {
    versionId,
    setVersionId: setVersionIdState,
    background: theme,
    side,
    languages: uniqueLanguages,
    totalLanguages: uniqueLanguages.length || 0,
    totalVersions: versionsLanguageInfo?.data?.length || 0,
    selectedLanguageId,
    setSelectedLanguageId,
    searchQuery,
    setSearchQuery,
    languageSearchQuery,
    setLanguageSearchQuery,
    filteredLanguages,
    isLoadingLanguages,
    closeLanguagePanel,
    closeLanguageSearch,
    resetLanguageSearch,
    suggestedLanguages,
    filteredVersions,
    filteredRecentVersions,
    view,
    setView,
    headerOwnsChrome: false,
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
        <YvComponentStyles />
        {children}
      </BibleVersionPickerContext.Provider>
    );
  }

  return (
    <BibleVersionPickerContext.Provider value={contextValue}>
      <YvComponentStyles />
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        {children}
      </Popover>
    </BibleVersionPickerContext.Provider>
  );
}

/**
 * Props for the version picker trigger. Interface direction owns the rendered
 * trigger's `dir`; a consumer-supplied `dir` is intentionally ignored.
 */
export type BibleVersionPickerTriggerProps = Omit<
  React.ComponentProps<typeof PopoverTrigger>,
  'children'
> & {
  children?:
    | React.ReactNode
    | ((props: { version: BibleVersion | null; loading: boolean }) => React.ReactNode);
};

function Trigger({ asChild = true, children, ...props }: BibleVersionPickerTriggerProps) {
  const { t } = useTranslation(undefined, { i18n });
  const interfaceDirection = useInterfaceDirection();
  const { versionId, selectedLanguageId, background, onVersionPickerPress } =
    useBibleVersionPickerContext();
  const { version, loading } = useVersion(versionId);

  const content =
    children instanceof Function
      ? children({ version, loading })
      : children || (
          <Button variant={'secondary'} className="yv:cursor-pointer yv:font-bold yv:text-base">
            <bdi dir="auto">{version?.localized_abbreviation || t('select')}</bdi>
          </Button>
        );

  const handlePress = (event: MouseEvent<HTMLButtonElement>) => {
    props.onClick?.(event);
    if (!event.defaultPrevented) {
      onVersionPickerPress?.({ versionId, languageId: selectedLanguageId });
    }
  };

  if (onVersionPickerPress) {
    if (asChild && isValidElement<TriggerElementProps>(content)) {
      return cloneElement(content, {
        'data-yv-sdk': true,
        'data-yv-theme': background,
        ...props,
        dir: interfaceDirection,
        onClick: handlePress,
      });
    }

    return (
      <button
        type="button"
        data-yv-sdk
        data-yv-theme={background}
        {...props}
        dir={interfaceDirection}
        onClick={handlePress}
      >
        {content}
      </button>
    );
  }

  return (
    <PopoverTrigger
      data-yv-sdk
      data-yv-theme={background}
      asChild={asChild}
      {...props}
      dir={interfaceDirection}
    >
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
  'aria-label': ariaLabel,
  className,
  onClick,
  size = 'sm',
  variant = 'secondary',
  ...props
}: BibleVersionPickerLanguageTriggerProps): React.ReactElement {
  const { t } = useTranslation(undefined, { i18n });
  const interfaceDirection = useInterfaceDirection();
  const { filteredVersions, filteredRecentVersions, setView, selectedLanguageId, versionsLoading } =
    useBibleVersionPickerContext();
  // Fetch the selected language details (may not be in the paginated languages list)
  const { language: selectedLanguage } = useLanguage(selectedLanguageId);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      setView('languages');
    }
  };

  return (
    <Button
      aria-label={ariaLabel ?? t('selectLanguageAriaLabel')}
      className={cn(
        'yv:ms-auto yv:bg-card yv:border yv:border-transparent yv:hover:bg-card yv:hover:border-border yv:max-w-40',
        className,
      )}
      size={size}
      onClick={handleClick}
      variant={variant}
      {...props}
      dir={interfaceDirection}
    >
      <GlobeIcon className="yv:size-4" />
      <span className="yv:text-sm yv:font-medium yv:truncate">
        <bdi dir="auto">{selectedLanguage?.display_names?.en || selectedLanguage?.language}</bdi>
      </span>
      <Badge
        variant="secondary"
        className="yv:h-5 yv:min-w-5 yv:rounded-full yv:px-1 yv:tabular-nums"
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
  const picker = useBibleVersionPickerContext();
  const { t } = useTranslation(undefined, { i18n });
  const {
    background,
    side,
    view,
    setIsPopoverOpen,
    closeLanguagePanel,
    closeLanguageSearch,
    onVersionPickerPress,
  } = picker;

  if (onVersionPickerPress && open === undefined && !onRequestClose) {
    return null;
  }

  if (open === undefined && !onRequestClose) {
    const heading =
      view === 'versions'
        ? t('bibleVersionsHeading')
        : view === 'languageSearch'
          ? t('searchLanguages')
          : t('selectLanguageHeading');
    const headingDescription =
      view === 'versions'
        ? t('versionsStatistics', {
            versionsCount: picker.totalVersions.toLocaleString(),
            languagesCount: picker.totalLanguages.toLocaleString(),
            defaultValue: '{{versionsCount}} Versions in {{languagesCount}} Languages',
          })
        : undefined;

    return (
      <BibleVersionPickerContext.Provider value={{ ...picker, headerOwnsChrome: true }}>
        <PopoverContent
          sideOffset={16}
          className="yv:h-[66svh]"
          heading={heading}
          headingDescription={headingDescription}
          showClose={view === 'versions'}
          headerLeading={
            view === 'versions' ? null : (
              <LanguageBackButton
                label={view === 'languageSearch' ? t('back') : t('backToBibleVersionsAriaLabel')}
                onClick={view === 'languageSearch' ? closeLanguageSearch : closeLanguagePanel}
              />
            )
          }
          headerChild={view === 'languages' ? <LanguageSearchButton /> : null}
          theme={background}
          side={side}
        >
          {view === 'versions' ? (
            <VersionList onRequestClose={() => setIsPopoverOpen(false)} />
          ) : (
            <LanguagePanel onRequestClose={closeLanguagePanel} />
          )}
        </PopoverContent>
      </BibleVersionPickerContext.Provider>
    );
  }

  return <VersionList open={open} onRequestClose={onRequestClose} />;
}

export const BibleVersionPicker = Object.assign({}, { Root, Trigger, Content });
export type BibleVersionPickerRootProps = RootProps;
