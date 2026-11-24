'use client';

import { useContext, useLayoutEffect, useRef, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useYVAuth, YouVersionContext } from '@youversion/platform-react-hooks';
import { getAdjacentChapter } from '@youversion/platform-core';
import i18n from '@/i18n';
import { useInterfaceDirection } from '@/lib/direction';
import { cn } from '@/lib/utils';
import type { FontFamily } from '@/lib/verse-html-utils';
import { ReuseShadowBoundary } from '@/lib/shadow-isolation';
import { useBibleReaderContext } from './bible-reader-context';
import { BibleChapterPicker } from './bible-chapter-picker';
import { BibleVersionPicker } from './bible-version-picker';
import { BibleReaderSearch } from './bible-reader-search';
import { BibleThemeSettingsContent } from './bible-theme-settings';
import { ChevronBackwardIcon } from './icons/chevron-backward';
import { ChevronForwardIcon } from './icons/chevron-forward';
import { GearIcon } from './icons/gear';
import { LoaderIcon } from './icons/loader';
import { PersonIcon } from './icons/person';
import { ProfileAvatar } from './profile-avatar';
import { Button } from './ui/button';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  BIBLE_READER_FONT,
  clampBibleReaderFontSize,
  nextBibleReaderFontSizeUp,
  nextBibleReaderFontSizeDown,
  changeBibleReaderLineSpacing,
  type BibleThemeSettingsValues,
  type BibleThemeSettingsSnapshot,
} from './bible-reader-settings';

function UserMenu() {
  const { t } = useTranslation(undefined, { i18n });
  const { auth, signIn, signOut, userInfo } = useYVAuth();
  const yvContext = useContext(YouVersionContext);
  const { onSignInPress, onSignOutPress } = useBibleReaderContext();

  // Prefer host-supplied native actions (e.g. the Expo DOM wrapper bridges these to
  // native PKCE sign-in). Fall back to the Web SDK's own auth for pure-web usage.
  const handleSignIn = () => {
    if (onSignInPress) {
      onSignInPress();
    } else {
      void signIn({ scopes: ['profile'] });
    }
  };
  const handleSignOut = () => {
    if (onSignOutPress) {
      onSignOutPress();
    } else {
      signOut();
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild data-testid="user-menu-trigger">
        {auth.isAuthenticated ? (
          <Button size="icon" variant="outline">
            <ReuseShadowBoundary>
              <ProfileAvatar
                name={userInfo?.name}
                src={userInfo?.getAvatarUrl(32, 32)?.toString()}
                aria-label={userInfo?.name || t('userAvatarAlt')}
                className="yv:size-full"
              />
            </ReuseShadowBoundary>
          </Button>
        ) : (
          <Button size="sm" variant="secondary">
            <PersonIcon className="yv:text-foreground" />
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent
        aria-label={auth.isAuthenticated ? t('signOut') : t('signIn')}
        theme={yvContext?.theme}
        className="yv:w-fit! yv:rounded-full"
        sideOffset={16}
        showHeader={false}
      >
        <PopoverClose asChild>
          {auth.isAuthenticated ? (
            <Button
              variant="secondary"
              className="yv:card yv:text-foreground"
              onClick={handleSignOut}
            >
              {t('signOut')}
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="yv:card yv:text-foreground"
              onClick={handleSignIn}
            >
              {t('signIn')}
            </Button>
          )}
        </PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

export type BibleReaderToolbarProps = {
  border?: 'top' | 'bottom';
  onOpenBibleThemeSettings?: (snapshot: BibleThemeSettingsSnapshot) => void;
  /**
   * Whether the toolbar renders the built-in search control.
   * `'control'` (default) | `'none'`. Mirrors `BibleReaderRootProps.verseActions`.
   */
  search?: 'control' | 'none';
};

export function Toolbar({
  border = 'top',
  onOpenBibleThemeSettings,
  search = 'control',
}: BibleReaderToolbarProps): JSX.Element {
  const { t } = useTranslation(undefined, { i18n });
  const interfaceDirection = useInterfaceDirection();
  const {
    book,
    chapter,
    versionId,
    setBook,
    setChapter,
    setVersionId,
    booksData,
    booksLoading,
    currentFontFamily,
    setCurrentFontFamily,
    currentFontSize,
    setCurrentFontSize,
    currentLineSpacing,
    setCurrentLineSpacing,
    background,
    onChapterPickerPress,
    onVersionPickerPress,
    languageId,
    defaultLanguageId,
    onLanguageChange,
  } = useBibleReaderContext();
  const yvContext = useContext(YouVersionContext);
  const themesSettingsValuesRef = useRef<BibleThemeSettingsValues>({
    fontSize: currentFontSize,
    fontFamily: currentFontFamily,
    lineSpacing: currentLineSpacing,
  });

  useLayoutEffect(() => {
    themesSettingsValuesRef.current = {
      fontSize: currentFontSize,
      fontFamily: currentFontFamily,
      lineSpacing: currentLineSpacing,
    };
  });

  const applyThemeSettings = (
    themeSettings: BibleThemeSettingsValues,
  ): BibleThemeSettingsValues => {
    const nextThemeSettings = {
      fontSize: clampBibleReaderFontSize(themeSettings.fontSize),
      fontFamily: themeSettings.fontFamily,
      lineSpacing: themeSettings.lineSpacing,
    };

    themesSettingsValuesRef.current = nextThemeSettings;
    setCurrentFontSize(nextThemeSettings.fontSize);
    setCurrentFontFamily(nextThemeSettings.fontFamily);
    setCurrentLineSpacing(nextThemeSettings.lineSpacing);

    return nextThemeSettings;
  };

  const handleFontIncreased = (): BibleThemeSettingsValues => {
    const settings = themesSettingsValuesRef.current;
    return applyThemeSettings({
      ...settings,
      fontSize: nextBibleReaderFontSizeUp(settings.fontSize),
    });
  };

  const handleFontDecreased = (): BibleThemeSettingsValues => {
    const settings = themesSettingsValuesRef.current;
    return applyThemeSettings({
      ...settings,
      fontSize: nextBibleReaderFontSizeDown(settings.fontSize),
    });
  };

  const handleFontSelected = (fontFamily: FontFamily): BibleThemeSettingsValues => {
    return applyThemeSettings({
      ...themesSettingsValuesRef.current,
      fontFamily,
    });
  };

  const handleLineSpacingChange = (): BibleThemeSettingsValues => {
    const settings = themesSettingsValuesRef.current;
    return applyThemeSettings({
      ...settings,
      lineSpacing: changeBibleReaderLineSpacing(settings.lineSpacing),
    });
  };

  const buildBibleThemeSettingsSnapshot = (): BibleThemeSettingsSnapshot => ({
    ...themesSettingsValuesRef.current,
    minFontSize: BIBLE_READER_FONT.MIN,
    maxFontSize: BIBLE_READER_FONT.MAX,
  });

  const prevResult = getAdjacentChapter(booksData, book, chapter, 'previous');
  const nextResult = getAdjacentChapter(booksData, book, chapter, 'next');
  const canNavigatePrevious = !booksLoading && prevResult !== null;
  const canNavigateNext = !booksLoading && nextResult !== null;
  const showSearch = search !== 'none';

  return (
    <section
      dir={interfaceDirection}
      className={cn(
        'yv:flex yv:justify-center yv:gap-2 yv:p-4 yv:bg-background yv:border-border yv:max-w-screen yv:overflow-x-hidden',
        border === 'top' && 'yv:border-t',
        border === 'bottom' && 'yv:border-b',
      )}
    >
      <div
        className={cn(
          'yv:grid yv:w-full yv:items-center yv:sm:max-w-lg yv:max-w-[calc(100vw-2rem)] yv:gap-3',
          yvContext?.authEnabled
            ? showSearch
              ? 'yv:grid-cols-[auto_1fr_auto_auto_auto]'
              : 'yv:grid-cols-[auto_1fr_auto_auto]'
            : showSearch
              ? 'yv:grid-cols-[1fr_auto_auto_auto]'
              : 'yv:grid-cols-[1fr_auto_auto]',
        )}
      >
        {yvContext?.authEnabled && <UserMenu />}

        <ReuseShadowBoundary>
          <BibleChapterPicker.Root
            book={book}
            chapter={chapter}
            onBookChange={setBook}
            onChapterChange={setChapter}
            versionId={versionId}
            background={background}
            onChapterPickerPress={onChapterPickerPress}
          >
            <BibleChapterPicker.Trigger>
              {({ chapterLabel, currentBook, loading }) => (
                <div className="yv:grid yv:grid-cols-[auto_1fr_auto] yv:justify-start yv:grid-rows-1 yv:overflow-hidden yv:rounded-full yv:min-w-30 yv:bg-muted yv:text-muted-foreground yv:hover:bg-muted/80">
                  <Button
                    className="yv:min-w-0 yv:group yv:place-self-center yv:touch-hitbox"
                    size="icon"
                    variant="ghost"
                    disabled={!canNavigatePrevious}
                    aria-label={t('previousChapterAriaLabel')}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (prevResult) {
                        setBook(prevResult.bookId);
                        setChapter(prevResult.chapterId);
                      }
                    }}
                  >
                    <ChevronBackwardIcon className="yv:transition-transform yv:duration-100 yv:group-active:translate-y-px" />
                  </Button>

                  <Button
                    size="lg"
                    variant="secondary"
                    className="yv:px-0 yv:font-bold yv:text-foreground yv:min-w-[5ch]"
                    disabled={loading}
                    aria-label={t('changeBibleBookAndChapterAriaLabel')}
                  >
                    {loading ? (
                      <LoaderIcon className="yv:size-4 yv:animate-spin yv:text-muted-foreground" />
                    ) : (
                      <>
                        <bdi dir="auto" className="yv:min-w-[3ch] yv:truncate">
                          {currentBook?.title || t('select')}
                        </bdi>
                        <bdi dir="auto" className="yv:tabular-nums yv:min-w-[1ch] yv:truncate">
                          {chapterLabel || ''}
                        </bdi>
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (nextResult) {
                        setBook(nextResult.bookId);
                        setChapter(nextResult.chapterId);
                      }
                    }}
                    className="yv:min-w-0 yv:group yv:place-self-center yv:touch-hitbox"
                    size="icon"
                    variant="ghost"
                    disabled={!canNavigateNext}
                    aria-label={t('nextChapterAriaLabel')}
                  >
                    <ChevronForwardIcon className="yv:transition-transform yv:duration-100 yv:group-active:translate-y-px" />
                  </Button>
                </div>
              )}
            </BibleChapterPicker.Trigger>
          </BibleChapterPicker.Root>
        </ReuseShadowBoundary>

        <ReuseShadowBoundary>
          <BibleVersionPicker.Root
            versionId={versionId}
            onVersionChange={setVersionId}
            languageId={languageId}
            defaultLanguageId={defaultLanguageId}
            onLanguageChange={onLanguageChange}
            background={background}
            onVersionPickerPress={onVersionPickerPress}
          >
            <BibleVersionPicker.Trigger aria-label={t('changeBibleVersionAriaLabel')}>
              {({ version, loading }) => (
                <Button
                  size="lg"
                  variant="secondary"
                  className="yv:min-w-[calc(0.25rem*4*2+3ch)] yv:px-4 yv:font-bold yv:text-foreground"
                  disabled={loading}
                  aria-label={
                    loading ? t('loadingBibleVersionAriaLabel') : t('changeBibleVersionAriaLabel')
                  }
                >
                  {/* This div exists merely as a wrapper to minimize width layout shifting */}
                  <div className="yv:min-w-[3ch] yv:flex yv:justify-center">
                    {loading ? (
                      <LoaderIcon className="yv:size-4 yv:animate-spin yv:text-muted-foreground" />
                    ) : (
                      <bdi dir="auto" className="yv:truncate">
                        {version?.localized_abbreviation || t('selectVersion')}
                      </bdi>
                    )}
                  </div>
                </Button>
              )}
            </BibleVersionPicker.Trigger>
            <BibleVersionPicker.Content />
          </BibleVersionPicker.Root>
        </ReuseShadowBoundary>

        {showSearch ? <BibleReaderSearch /> : null}

        {onOpenBibleThemeSettings ? (
          <Button
            size="sm"
            variant="secondary"
            aria-label={t('settingsAriaLabel')}
            onClick={() => onOpenBibleThemeSettings(buildBibleThemeSettingsSnapshot())}
          >
            <GearIcon className="yv:text-foreground" />
          </Button>
        ) : (
          <Popover>
            <PopoverTrigger asChild aria-label={t('settingsAriaLabel')}>
              <Button size="sm" variant="secondary">
                <GearIcon className="yv:text-foreground" />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              sideOffset={16}
              heading={t('readerSettingsHeading')}
              theme={background}
              closeButtonClassName="yv:focus-visible:ring-inset yv:focus-visible:ring-ring"
            >
              <ReuseShadowBoundary>
                <BibleThemeSettingsContent
                  theme={background}
                  fontSize={currentFontSize}
                  fontFamily={currentFontFamily}
                  lineSpacing={currentLineSpacing}
                  onFontDecreased={handleFontDecreased}
                  onFontIncreased={handleFontIncreased}
                  onFontSelected={handleFontSelected}
                  onChangeLineSpacing={handleLineSpacingChange}
                />
              </ReuseShadowBoundary>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </section>
  );
}
