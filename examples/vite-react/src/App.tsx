import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BibleReaderNavigation } from '@youversion/platform-react-ui';
import { DestinationNav } from '@/components/destination-nav';
import { BibleCardPage } from '@/pages/BibleCardPage';
import { BibleReaderPage } from '@/pages/BibleReaderPage';
import { ExampleChild } from '@/pages/ExampleChild';
import { ExamplesPage } from '@/pages/ExamplesPage';
import { ImagesPage } from '@/pages/ImagesPage';
import { NavigationDemoPage } from '@/pages/NavigationDemoPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SearchUnifiedPage } from '@/pages/SearchUnifiedPage';
import { VotdPage } from '@/pages/VotdPage';
import { applyReaderCommand, type ReaderCommand } from '@/reader-command';
import {
  formatHash,
  readAppRoute,
  sameRoute,
  screenIdFor,
  withRouteHash,
  type AppRoute,
  type ScreenId,
} from '@/routes';

const screens = [
  'bible',
  'content',
  'examples',
  'profile',
  'navigation',
  'votd',
  'bible-card',
  'search',
] as const satisfies readonly ScreenId[];

function App() {
  const [navigation] = useState(() => new BibleReaderNavigation());
  const [route, setRoute] = useState<AppRoute>(() => readAppRoute(window.location.href));
  const activeScreen = screenIdFor(route);
  const [visited, setVisited] = useState<ReadonlySet<ScreenId>>(() => new Set([activeScreen]));
  const [contentImageId, setContentImageId] = useState<string | null>(null);
  const pendingRead = useRef<ReaderCommand | null>(null);
  const previousScreen = useRef(activeScreen);

  if (!visited.has(activeScreen)) {
    const next = new Set(visited);
    next.add(activeScreen);
    setVisited(next);
  }
  if (route.destination === 'content' && route.imageId !== contentImageId) {
    setContentImageId(route.imageId);
  }

  useEffect(() => {
    const sync = () => {
      const href = window.location.href;
      const next = readAppRoute(href);
      const canonical = withRouteHash(href, next);
      if (canonical !== href) window.history.replaceState(window.history.state, '', canonical);
      setRoute((current) => (sameRoute(current, next) ? current : next));
    };
    sync();
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  useEffect(() => {
    if (route.destination !== 'bible') {
      pendingRead.current = null;
      return;
    }
    const command = pendingRead.current;
    if (command === null) return;
    pendingRead.current = null;
    applyReaderCommand(navigation, command);
  }, [navigation, route]);

  useEffect(() => {
    if (previousScreen.current === activeScreen) return;
    previousScreen.current = activeScreen;
    const node = document.querySelector('[data-active-screen="true"]');
    if (node instanceof HTMLElement) node.focus();
  }, [activeScreen]);

  function openBible(command: ReaderCommand) {
    pendingRead.current = command;
    window.location.hash = formatHash({ destination: 'bible' });
  }

  function readImageInBible(passageId: string, versionId: number) {
    openBible({
      kind: 'show-passage',
      passageId,
      versionId,
      showsFullChapter: true,
    });
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <DestinationNav route={route} />
      <main className="relative min-h-0 flex-1">
        {screens.map((screen) =>
          visited.has(screen) ? (
            <KeptScreen key={screen} active={screen === activeScreen} scroll={screen !== 'bible'}>
              {screenBody(
                screen,
                navigation,
                contentImageId,
                openBible,
                readImageInBible,
                screen === activeScreen,
              )}
            </KeptScreen>
          ) : null,
        )}
      </main>
    </div>
  );
}

function screenBody(
  screen: ScreenId,
  navigation: BibleReaderNavigation,
  contentImageId: string | null,
  openBible: (command: ReaderCommand) => void,
  readImageInBible: (passageId: string, versionId: number) => void,
  active: boolean,
): ReactNode {
  switch (screen) {
    case 'bible':
      return <BibleReaderPage navigation={navigation} />;
    case 'content':
      return (
        <ImagesPage
          imageId={contentImageId}
          active={active}
          onSelectImage={(imageId) => {
            window.location.hash = formatHash({ destination: 'content', imageId });
          }}
          onReadInBible={readImageInBible}
        />
      );
    case 'examples':
      return <ExamplesPage />;
    case 'profile':
      return <ProfilePage />;
    case 'navigation':
      return (
        <ExampleChild>
          <NavigationDemoPage onReadInBible={openBible} />
        </ExampleChild>
      );
    case 'votd':
      return (
        <ExampleChild>
          <VotdPage />
        </ExampleChild>
      );
    case 'bible-card':
      return (
        <ExampleChild>
          <BibleCardPage />
        </ExampleChild>
      );
    case 'search':
      return (
        <ExampleChild>
          <SearchUnifiedPage />
        </ExampleChild>
      );
    default: {
      const unreachable: never = screen;
      return unreachable;
    }
  }
}

function KeptScreen({
  active,
  scroll,
  children,
}: {
  active: boolean;
  scroll: boolean;
  children: ReactNode;
}) {
  return (
    <div
      data-demo-scroll={scroll ? true : undefined}
      data-active-screen={active ? 'true' : undefined}
      hidden={active ? undefined : true}
      inert={active ? undefined : true}
      tabIndex={active ? -1 : undefined}
      className={
        scroll
          ? 'absolute inset-0 overflow-auto outline-none'
          : 'absolute inset-0 overflow-hidden outline-none'
      }
    >
      {children}
    </div>
  );
}

export default App;
