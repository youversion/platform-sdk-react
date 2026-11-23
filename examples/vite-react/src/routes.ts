export const destinations = [
  { id: 'bible', label: 'Bible' },
  { id: 'content', label: 'Content' },
  { id: 'examples', label: 'Examples' },
  { id: 'profile', label: 'Profile' },
] as const;

export const exampleLinks = [
  { id: 'navigation', label: 'Navigation' },
  { id: 'votd', label: 'Verse of the Day' },
  { id: 'bible-card', label: 'Bible Card' },
  { id: 'search', label: 'Unified Search' },
] as const;

export type Destination = (typeof destinations)[number]['id'];
export type ExampleId = (typeof exampleLinks)[number]['id'];

export type AppRoute =
  | { readonly destination: 'bible' }
  | { readonly destination: 'content'; readonly imageId: string | null }
  | { readonly destination: 'examples'; readonly exampleId: ExampleId | null }
  | { readonly destination: 'profile' };

export type ScreenId = Destination | ExampleId;

const bibleRoute = { destination: 'bible' } as const satisfies AppRoute;

export function rootRoute(destination: Destination): AppRoute {
  switch (destination) {
    case 'bible':
      return bibleRoute;
    case 'profile':
      return { destination: 'profile' };
    case 'content':
      return { destination: 'content', imageId: null };
    case 'examples':
      return { destination: 'examples', exampleId: null };
    default: {
      const unreachable: never = destination;
      return unreachable;
    }
  }
}

function fragmentFromHref(href: string): string {
  const hashAt = href.indexOf('#');
  return hashAt === -1 ? '' : href.slice(hashAt + 1);
}

export function readAppRoute(href: string): AppRoute {
  return parseFragment(fragmentFromHref(href));
}

export function parseFragment(fragment: string): AppRoute {
  const queryAt = fragment.indexOf('?');
  const path = queryAt === -1 ? fragment : fragment.slice(0, queryAt);
  const segments = path.split('/').filter((segment) => segment.length > 0);
  const head = segments[0];
  if (head === undefined) return bibleRoute;
  const destination = destinationById(head);
  if (destination === null) return bibleRoute;
  const rest = segments.slice(1);
  switch (destination) {
    case 'bible':
      return bibleRoute;
    case 'profile':
      return { destination: 'profile' };
    case 'content':
      return parseContent(rest);
    case 'examples':
      return parseExamples(rest);
    default: {
      const unreachable: never = destination;
      return unreachable;
    }
  }
}

export function formatHash(route: AppRoute): string {
  switch (route.destination) {
    case 'bible':
      return '#/bible';
    case 'profile':
      return '#/profile';
    case 'content':
      return route.imageId === null
        ? '#/content'
        : `#/content/image/${encodeURIComponent(route.imageId)}`;
    case 'examples':
      return route.exampleId === null ? '#/examples' : `#/examples/${route.exampleId}`;
    default: {
      const unreachable: never = route;
      return unreachable;
    }
  }
}

export function withRouteHash(currentHref: string, route: AppRoute): string {
  const hashAt = currentHref.indexOf('#');
  const withoutHash = hashAt === -1 ? currentHref : currentHref.slice(0, hashAt);
  return `${withoutHash}${formatHash(route)}`;
}

export function screenIdFor(route: AppRoute): ScreenId {
  if (route.destination === 'examples' && route.exampleId !== null) return route.exampleId;
  return route.destination;
}

export function sameRoute(left: AppRoute, right: AppRoute): boolean {
  return formatHash(left) === formatHash(right);
}

function destinationById(value: string): Destination | null {
  for (const destination of destinations) {
    if (destination.id === value) return destination.id;
  }
  return null;
}

function exampleById(value: string): ExampleId | null {
  for (const example of exampleLinks) {
    if (example.id === value) return example.id;
  }
  return null;
}

function parseContent(segments: readonly string[]): AppRoute {
  const list = { destination: 'content', imageId: null } as const satisfies AppRoute;
  if (segments.length !== 2 || segments[0] !== 'image') return list;
  const imageId = decodePathSegment(segments[1] ?? '');
  if (imageId === null || imageId.trim() === '') return list;
  return { destination: 'content', imageId };
}

function parseExamples(segments: readonly string[]): AppRoute {
  const index = { destination: 'examples', exampleId: null } as const satisfies AppRoute;
  if (segments.length !== 1) return index;
  const decoded = decodePathSegment(segments[0] ?? '');
  if (decoded === null) return index;
  const exampleId = exampleById(decoded);
  if (exampleId === null) return index;
  return { destination: 'examples', exampleId };
}

function decodePathSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}
