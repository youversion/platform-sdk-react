import type { Video, VideoThumbnailSize } from './schemas/video';

/** Internal response normalization shared by video detail and video search. */
export function resolveVideoThumbnail(video: Video, size?: VideoThumbnailSize): Video {
  if (video.thumbnail?.url == null) {
    return video;
  }
  const url = new URL(video.thumbnail.url);
  url.searchParams.delete('size');
  if (size !== undefined) {
    url.searchParams.set('size', size);
  }
  return { ...video, thumbnail: { ...video.thumbnail, url: url.href } };
}
