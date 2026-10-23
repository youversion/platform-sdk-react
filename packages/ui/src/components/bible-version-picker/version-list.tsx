'use client';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useInterfaceDirection } from '@/lib/direction';
import { cn } from '@/lib/utils';
import { type BibleVersion } from '@youversion/platform-core';
import { useLanguage, useOrganizations } from '@youversion/platform-react-hooks';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { ChevronForwardIcon } from '../icons/chevron-forward';
import { GlobeIcon } from '../icons/globe';
import { LoaderIcon } from '../icons/loader';
import { SearchIcon } from '../icons/search';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '../ui/item';
import {
  useBibleVersionPickerContext,
  type BibleVersionPickerContentProps,
  type RecentVersion,
} from './index';
import { languageRowNames } from './language-row';

// The name is resolved once at the list level and passed in, so rows sharing a
// publisher don't each fire their own request. Renders nothing when no name is
// known, so the title stays vertically centered.
function VersionPublisherName({ name }: { name?: string | null }) {
  if (!name) return null;

  return (
    <ItemDescription className="yv:line-clamp-1 yv:text-start">
      <bdi dir="auto">{name}</bdi>
    </ItemDescription>
  );
}

// Scales the abbreviation to the icon box. A trailing digit wraps onto a
// second line so "KJV2" stays readable inside the fixed tile.
function VersionAbbreviationIcon({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefixRef = useRef<HTMLDivElement>(null);
  const [prefixSize, setPrefixSize] = useState(20);

  const match = /^(.+?)(\d+)$/.exec(text) || [];
  const prefix = match[1] || text;
  const digits = match[2];

  useEffect(() => {
    const container = containerRef.current;
    const prefixElement = prefixRef.current;
    if (!container || !prefixElement) return;

    const calculateSize = (element: HTMLElement | null) => {
      if (!element) return 20;

      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      const targetWidth = containerWidth * 0.7;
      const maxHeight = containerHeight * 0.4;

      let currentSize = 20;
      let ratio = 1;

      for (let i = 0; i < 5; i++) {
        element.style.fontSize = `${currentSize}px`;
        const currentWidth = element.scrollWidth;
        const currentHeight = element.offsetHeight;

        if (currentWidth > 0) {
          const widthRatio = targetWidth / currentWidth;
          const heightRatio = maxHeight / currentHeight;
          ratio = Math.min(widthRatio, heightRatio);
          currentSize = currentSize * ratio;
        }
      }

      return Math.max(12, currentSize);
    };

    const updateSizes = () => {
      const newPrefixSize = calculateSize(prefixElement);
      setPrefixSize(newPrefixSize);
    };

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
      dir="auto"
      className="yv:flex yv:flex-col yv:w-full yv:h-full yv:px-1.5 yv:font-serif! yv:[&_*]:font-serif! yv:leading-[1.03] yv:font-bold yv:text-foreground yv:items-center yv:justify-center"
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

function LanguageEntry(): ReactElement {
  const { t } = useTranslation(undefined, { i18n });
  const { filteredVersions, filteredRecentVersions, selectedLanguageId, setView, versionsLoading } =
    useBibleVersionPickerContext();
  const { language } = useLanguage(selectedLanguageId);
  const name = language
    ? languageRowNames({ id: selectedLanguageId, display_names: language.display_names }).primary
    : selectedLanguageId;
  const count = filteredVersions.length + filteredRecentVersions.length;

  return (
    <button
      type="button"
      className="yv:flex yv:w-full yv:items-center yv:justify-between yv:gap-3 yv:px-4 yv:py-3 yv:text-start yv:hover:bg-muted"
      aria-label={`${t('language')} ${name}`}
      onClick={() => setView('languages')}
    >
      <span className="yv:flex yv:min-w-0 yv:items-center yv:gap-2" aria-hidden="true">
        <GlobeIcon className="yv:size-6 yv:shrink-0" />
        <span className="yv:truncate yv:text-[13px]! yv:font-normal! yv:leading-[1.25]">
          {t('language')}
        </span>
      </span>
      <span className="yv:flex yv:shrink-0 yv:items-center yv:gap-1.5" aria-hidden="true">
        <bdi dir="auto" className="yv:text-xs! yv:font-bold! yv:leading-4">
          {name}
        </bdi>
        <span className="yv:flex yv:min-w-4 yv:items-center yv:justify-center yv:rounded-lg yv:bg-muted yv:px-1 yv:text-[10px]! yv:font-medium! yv:leading-4 yv:tabular-nums">
          {versionsLoading ? <LoaderIcon className="yv:size-3 yv:animate-spin" /> : count}
        </span>
        <ChevronForwardIcon className="yv:size-4 yv:shrink-0 yv:text-muted-foreground" />
      </span>
    </button>
  );
}

export function VersionList({
  open,
  onRequestClose,
}: BibleVersionPickerContentProps = {}): ReactElement {
  const { t } = useTranslation(undefined, { i18n });
  const interfaceDirection = useInterfaceDirection();
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
    resetLanguageSearch,
    setView,
  } = useBibleVersionPickerContext();
  const wasOpenRef = useRef(open ?? false);

  const { organizations } = useOrganizations([
    ...filteredRecentVersions.map((version) => version.organization_id),
    ...filteredVersions.map((version) => version.organization_id),
  ]);
  const publisherName = (organizationId?: string | null) =>
    organizationId ? (organizations.get(organizationId)?.name ?? null) : null;

  const handleSelectVersion = (version: BibleVersion | RecentVersion) => {
    setVersionId(version.id);
    addRecentVersion({
      id: version.id,
      title: version.title,
      localized_abbreviation: version.localized_abbreviation,
      abbreviation: version.abbreviation,
      organization_id: version.organization_id,
    });
    setSearchQuery('');
    onRequestClose?.();
  };

  useEffect(() => {
    if (wasOpenRef.current && open === false) {
      setSearchQuery('');
      resetLanguageSearch();
      setView('versions');
    }
    wasOpenRef.current = open ?? false;
  }, [open, resetLanguageSearch, setSearchQuery, setView]);

  const versionTileClassName =
    'yv:rounded-[6px] yv:size-12 yv:bg-secondary yv:border yv:border-border yv:flex yv:flex-col yv:justify-center yv:items-center';
  const versionRowClassName = (selected: boolean) =>
    cn('yv:hover:bg-muted yv:rounded-lg', selected ? 'yv:bg-muted' : '');

  return (
    <div
      className="yv:overflow-y-auto yv:h-full yv:flex yv:flex-col yv:font-sans yv:transition-all yv:duration-300 yv:rounded-2xl yv:origin-center"
      data-yv-sdk
      data-yv-theme={background}
      dir={interfaceDirection}
    >
      <div className="yv:shrink-0">
        <section className="yv:px-4 yv:pt-4">
          <InputGroup className="yv:h-auto yv:rounded-full yv:border-0 yv:bg-muted yv:py-1 yv:shadow-none">
            <InputGroupInput
              aria-label={t('versionSearchAriaLabel')}
              tabIndex={1}
              type="text"
              placeholder={t('searchPlaceholder')}
              dir="auto"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            ></InputGroupInput>
            <InputGroupAddon>
              <SearchIcon className="yv:size-6 yv:text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </section>
        <LanguageEntry />
      </div>
      <div className="yv:flex-1 yv:overflow-y-auto yv:py-2">
        {filteredRecentVersions.length > 0 && (
          <>
            <h2 className="yv:px-4 yv:py-2 yv:text-xl yv:font-bold yv:leading-6">
              {t('recentlyUsedVersionsHeading')}
            </h2>
            <ItemGroup data-testid="recent-version-list">
              {filteredRecentVersions.map((version) => (
                <Item
                  key={`recent-${version.id}`}
                  className={versionRowClassName(versionId === version.id)}
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
                    <ItemMedia variant="icon" className={versionTileClassName}>
                      <VersionAbbreviationIcon text={version.localized_abbreviation} />
                    </ItemMedia>
                    <ItemContent>
                      <VersionPublisherName name={publisherName(version.organization_id)} />
                      <ItemTitle className="yv:line-clamp-2 yv:text-start yv:text-[13px]! yv:font-medium! yv:leading-[1.25]">
                        <bdi dir="auto">{version.title}</bdi>
                      </ItemTitle>
                    </ItemContent>
                  </button>
                </Item>
              ))}
            </ItemGroup>
          </>
        )}
        {filteredVersions.length > 0 ? (
          <ItemGroup data-testid="version-list">
            <h3 className="yv:px-4 yv:py-2 yv:text-xl yv:font-bold yv:leading-6">
              {t('allVersionsHeading')}
            </h3>
            {filteredVersions.map((version: BibleVersion) => (
              <Item
                key={version.id}
                className={versionRowClassName(versionId === version.id)}
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
                  <ItemMedia variant="icon" className={versionTileClassName}>
                    <VersionAbbreviationIcon text={version.localized_abbreviation} />
                  </ItemMedia>
                  <ItemContent>
                    <VersionPublisherName name={publisherName(version.organization_id)} />
                    <ItemTitle className="yv:line-clamp-2 yv:text-start yv:text-[13px]! yv:font-medium! yv:leading-[1.25]">
                      <bdi dir="auto">{version.title}</bdi>
                    </ItemTitle>
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
            {t('noVersionsFound')}
          </div>
        ) : null}
      </div>
    </div>
  );
}
