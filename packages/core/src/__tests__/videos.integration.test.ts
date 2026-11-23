import { expect, it } from 'vitest';
import { ApiClient } from '../client';
import { VideosClient } from '../videos';

const { INTEGRATION_TESTS, YVP_APP_KEY, YVP_API_HOST, YVP_VIDEO_ORGANIZATION_ID } = process.env;

it.skipIf(INTEGRATION_TESTS !== 'true' || !YVP_APP_KEY || !YVP_VIDEO_ORGANIZATION_ID)(
  'resolves a video id returned by the organization playlists',
  async () => {
    if (!YVP_APP_KEY || !YVP_VIDEO_ORGANIZATION_ID)
      throw new Error('Missing live video test configuration');
    const videos = new VideosClient(new ApiClient({ appKey: YVP_APP_KEY, apiHost: YVP_API_HOST }));
    const page = await videos.getPlaylists(YVP_VIDEO_ORGANIZATION_ID, {
      fields: ['id', 'videos'],
      pageSize: '*',
    });
    const id = page.data.flatMap((playlist) => playlist.videos ?? [])[0];
    if (!id) throw new Error('The test organization needs a playlist containing a video');
    const detail = await videos.getVideo(id);
    expect(detail.id.length).toBeGreaterThan(0);
  },
);
