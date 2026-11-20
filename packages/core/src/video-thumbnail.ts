import type { ContentLibraryVideo, VideoThumbnailSize } from './schemas/video';

/** @internal Response normalization shared by video detail and video search. */
export function resolveVideoThumbnail(
  video: ContentLibraryVideo,
  size?: VideoThumbnailSize,
): ContentLibraryVideo {
  if (video.thumbnail?.url == null) {
    return video;
  }
  const resolvedUrl = withThumbnailSize(video.thumbnail.url, size);
  if (resolvedUrl === video.thumbnail.url) {
    return video;
  }
  return { ...video, thumbnail: { ...video.thumbnail, url: resolvedUrl } };
}

function withThumbnailSize(url: string, size?: VideoThumbnailSize): string {
  const fragmentIndex = url.indexOf('#');
  const fragment = fragmentIndex === -1 ? '' : url.slice(fragmentIndex);
  const beforeFragment = fragmentIndex === -1 ? url : url.slice(0, fragmentIndex);
  const queryIndex = beforeFragment.indexOf('?');
  const resource = queryIndex === -1 ? beforeFragment : beforeFragment.slice(0, queryIndex);
  const rawQuery = queryIndex === -1 ? '' : beforeFragment.slice(queryIndex + 1);
  const parameters = rawQuery === '' ? [] : rawQuery.split('&');
  if (size === undefined && !parameters.some(isSizeParameter)) {
    return url;
  }
  const keptParameters = parameters.filter((parameter) => !isSizeParameter(parameter));

  if (size !== undefined) {
    keptParameters.push(`size=${size}`);
  }
  if (keptParameters.length === 0) {
    return `${resource}${fragment}`;
  }
  return `${resource}?${keptParameters.join('&')}${fragment}`;
}

function isSizeParameter(parameter: string): boolean {
  const equalsIndex = parameter.indexOf('=');
  const encodedName = equalsIndex === -1 ? parameter : parameter.slice(0, equalsIndex);
  try {
    return decodeURIComponent(encodedName.replaceAll('+', ' ')) === 'size';
  } catch {
    return false;
  }
}
