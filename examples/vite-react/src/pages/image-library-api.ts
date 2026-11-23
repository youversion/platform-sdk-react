import {
  ApiClient,
  isValidStructuralUsfmReference,
  BibleClient,
  ImagesClient,
  SearchClient,
  getHttpStatus,
  type BibleVersion,
  type VerseImage,
} from '@youversion/platform-react-ui';
import { API_TIMEOUT_MS } from '../api-timeout';

export function createImageLibraryClients() {
  const api = new ApiClient({
    appKey: import.meta.env.VITE_YVP_APP_KEY?.trim() ?? '',
    apiHost: import.meta.env.VITE_YVP_API_HOST ?? 'api.youversion.com',
    timeout: API_TIMEOUT_MS,
  });
  return {
    images: new ImagesClient(api),
    search: new SearchClient(api),
    bible: new BibleClient(api),
  };
}

export type ImageLibraryClients = ReturnType<typeof createImageLibraryClients>;
export type ReadImagePassage = (passageId: string, versionId: number) => void;

export function imageError(error: Error): string {
  const message = error.message;
  const status = getHttpStatus(error);
  return status === undefined ? message : `HTTP ${status}: ${message}`;
}

export function imageUrl(source: string, size: 'thumb' | 'card' | 'full'): string {
  try {
    const url = new URL(source);
    url.searchParams.set('size', size);
    return url.href;
  } catch {
    return source;
  }
}

export async function resolveImageBible(
  bible: BibleClient,
  language: string,
  passageId?: string,
): Promise<BibleVersion> {
  if (passageId && !isValidStructuralUsfmReference(passageId)) {
    throw new Error('This image has an invalid Bible passage.');
  }
  const ranges =
    language === 'zh-CN'
      ? [language, 'zh']
      : language === 'zh-TW' || language === 'zh-HK'
        ? [language, 'zh-Hant', 'zh']
        : [language];
  for (const range of ranges) {
    const versions: BibleVersion[] = [];
    const visited = new Set<string>();
    let token: string | null = null;
    do {
      const page = await bible.getVersions(range, undefined, {
        page_size: 99,
        page_token: token ?? undefined,
      });
      versions.push(
        ...page.data.filter((v) => !passageId || v.books.includes(passageId.split('.')[0])),
      );
      token = page.next_page_token;
      if (token !== null && visited.has(token))
        throw new Error('Unable to finish loading Bible versions. Please retry.');
      if (token !== null) visited.add(token);
    } while (token !== null);
    versions.sort((a, b) => a.id - b.id);
    const selected =
      (range === 'en' ? versions.find((v) => v.id === 3034) : undefined) ??
      versions.find((v) => v.language_tag.toLowerCase() === range.toLowerCase()) ??
      versions[0];
    if (selected) return selected;
  }
  throw new Error(
    passageId
      ? 'This passage is unavailable in the selected language.'
      : 'No Bible is available in the selected language.',
  );
}

export function appendImages(
  current: readonly VerseImage[],
  incoming: readonly VerseImage[],
): VerseImage[] {
  const known = new Set(current.map((image) => image.id));
  return [
    ...current,
    ...incoming.filter((image) => {
      if (known.has(image.id)) return false;
      known.add(image.id);
      return true;
    }),
  ];
}
