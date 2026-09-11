import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  ApiClient,
  BIBLE_CONTAINER_ATTRIBUTES,
  BIBLE_CSS_STYLESHEET_URL,
  BibleClient,
  MissingPassageAttributionError,
  getBibleStylesheets,
  getPassageDisplay,
} from '../index';
import { BiblePassageDisplaySchema } from '../schemas/passage-display';
import { YouVersionPlatformConfiguration } from '../YouVersionPlatformConfiguration';
import { mockNIVGen1Verse1PassageHTML } from './MockPassages';
import { mockVersionKJV } from './MockVersions';
import { server } from './setup';

const apiHost = process.env.YVP_API_HOST || 'api.youversion.com';
const mockDisplayVersion = { ...mockVersionKJV, id: 111 };

function createApiClient(appKey = 'test app/key'): ApiClient {
  return new ApiClient({
    apiHost,
    appKey,
    installationId: 'test-installation',
  });
}

function createBibleClient(appKey = 'test app/key'): BibleClient {
  return new BibleClient(createApiClient(appKey));
}

function clearVersionFilters(): void {
  YouVersionPlatformConfiguration.permittedVersionIds = undefined;
  YouVersionPlatformConfiguration.excludedVersionIds = undefined;
  YouVersionPlatformConfiguration.permittedLanguageTags = undefined;
}

function setupDisplayTest(): void {
  clearVersionFilters();
  server.use(
    http.get(`https://${apiHost}/v1/bibles/:id`, () => HttpResponse.json(mockDisplayVersion)),
  );
}

describe.skipIf(Boolean(process.env.INTEGRATION_TESTS))('passage display model', () => {
  it('returns transformed HTML, current attribution, stylesheets, and container attributes', async () => {
    setupDisplayTest();
    const display = await createBibleClient().getPassageDisplay({
      versionId: 111,
      passageId: 'GEN.1.1',
    });

    expect(BiblePassageDisplaySchema.safeParse(display).success).toBe(true);
    expect(display.html).toBe(display.passage.content);
    expect(display.html).toContain('data-yv-transformed');
    expect(display.version).toEqual(mockDisplayVersion);
    expect(display.attribution).toEqual({
      text: mockDisplayVersion.copyright,
      source: 'copyright',
    });
    expect(display.stylesheets).toEqual([
      {
        kind: 'bible',
        rel: 'stylesheet',
        href: BIBLE_CSS_STYLESHEET_URL,
      },
      {
        kind: 'font',
        rel: 'stylesheet',
        href: `https://${apiHost}/v1/fonts/1/stylesheet?app_key=test%20app%2Fkey`,
      },
    ]);
    expect(display.containerAttributes).toEqual(BIBLE_CONTAINER_ATTRIBUTES);
  });

  it('forwards heading and note options to the passage request', async () => {
    setupDisplayTest();
    const display = await createBibleClient().getPassageDisplay({
      versionId: 111,
      passageId: 'ROM.1',
      includeHeadings: true,
      includeNotes: true,
    });

    expect(display.html).toContain('yv-h');
    expect(display.html).toContain('data-verse-footnote');
  });

  it('supports the public tree-shakable function', async () => {
    setupDisplayTest();
    const display = await getPassageDisplay(createApiClient(), {
      versionId: 111,
      passageId: 'GEN.1.1',
    });

    expect(display.html).toContain('data-yv-transformed');
    expect(display.attribution.source).toBe('copyright');
  });

  it('requests fresh attribution for repeated display operations', async () => {
    setupDisplayTest();
    let versionRequests = 0;
    server.use(
      http.get(`https://${apiHost}/v1/bibles/:id`, () => {
        versionRequests += 1;
        return HttpResponse.json({
          ...mockDisplayVersion,
          copyright: versionRequests === 1 ? 'First attribution' : 'Second attribution',
        });
      }),
    );
    const client = createBibleClient();
    const options = { versionId: 111, passageId: 'GEN.1.1' } as const;

    const first = await client.getPassageDisplay(options);
    const second = await client.getPassageDisplay(options);

    expect(first.attribution.text).toBe('First attribution');
    expect(second.attribution.text).toBe('Second attribution');
    expect(versionRequests).toBe(2);
  });

  it('falls back to promotional content when copyright is empty', async () => {
    setupDisplayTest();
    server.use(
      http.get(`https://${apiHost}/v1/bibles/:id`, () =>
        HttpResponse.json({
          ...mockDisplayVersion,
          copyright: '   ',
          promotional_content: 'Required long-form attribution',
        }),
      ),
    );

    const display = await createBibleClient().getPassageDisplay({
      versionId: 111,
      passageId: 'GEN.1.1',
    });

    expect(display.attribution).toEqual({
      text: 'Required long-form attribution',
      source: 'promotionalContent',
    });
  });

  it('fails closed when the version has no display attribution', async () => {
    setupDisplayTest();
    server.use(
      http.get(`https://${apiHost}/v1/bibles/:id`, () =>
        HttpResponse.json({
          ...mockDisplayVersion,
          copyright: null,
          promotional_content: null,
        }),
      ),
    );

    const result = createBibleClient().getPassageDisplay({
      versionId: 111,
      passageId: 'GEN.1.1',
    });

    await expect(result).rejects.toBeInstanceOf(MissingPassageAttributionError);
    await expect(result).rejects.toMatchObject({
      code: 'missing_passage_attribution',
      versionId: 111,
    });
  });

  it('starts passage and version requests concurrently when no language filter is active', async () => {
    setupDisplayTest();
    let requestCount = 0;
    let releaseRequests: (() => void) | undefined;
    const bothRequestsStarted = new Promise<void>((resolve) => {
      releaseRequests = resolve;
    });
    const waitAtBarrier = async () => {
      requestCount += 1;
      if (requestCount === 2) releaseRequests?.();
      await bothRequestsStarted;
    };

    server.use(
      http.get(`https://${apiHost}/v1/bibles/:id`, async () => {
        await waitAtBarrier();
        return HttpResponse.json(mockDisplayVersion);
      }),
      http.get(`https://${apiHost}/v1/bibles/:id/passages/GEN.1.1`, async () => {
        await waitAtBarrier();
        return HttpResponse.json(mockNIVGen1Verse1PassageHTML);
      }),
    );

    await createBibleClient().getPassageDisplay({
      versionId: 111,
      passageId: 'GEN.1.1',
    });

    expect(requestCount).toBe(2);
  });

  it('reuses the version request when a language filter requires metadata validation', async () => {
    setupDisplayTest();
    YouVersionPlatformConfiguration.permittedLanguageTags = ['en'];
    let versionRequests = 0;
    let passageRequests = 0;
    server.use(
      http.get(`https://${apiHost}/v1/bibles/:id`, () => {
        versionRequests += 1;
        return HttpResponse.json(mockDisplayVersion);
      }),
      http.get(`https://${apiHost}/v1/bibles/:id/passages/GEN.1.1`, () => {
        passageRequests += 1;
        return HttpResponse.json(mockNIVGen1Verse1PassageHTML);
      }),
    );

    await createBibleClient().getPassageDisplay({
      versionId: 111,
      passageId: 'GEN.1.1',
    });

    expect(versionRequests).toBe(1);
    expect(passageRequests).toBe(1);
  });

  it('refuses an excluded version before requesting passage content', async () => {
    clearVersionFilters();
    YouVersionPlatformConfiguration.excludedVersionIds = [111];
    let passageRequests = 0;
    server.use(
      http.get(`https://${apiHost}/v1/bibles/:id/passages/:passageId`, () => {
        passageRequests += 1;
        return HttpResponse.json(mockNIVGen1Verse1PassageHTML);
      }),
    );

    await expect(
      createBibleClient().getPassageDisplay({
        versionId: 111,
        passageId: 'GEN.1.1',
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(passageRequests).toBe(0);
  });

  it('validates display inputs', async () => {
    clearVersionFilters();
    await expect(
      createBibleClient().getPassageDisplay({ versionId: 0, passageId: 'GEN.1.1' }),
    ).rejects.toThrow('Version ID must be a positive integer');
    await expect(
      createBibleClient().getPassageDisplay({ versionId: 111, passageId: '   ' }),
    ).rejects.toThrow('Passage ID must be a non-empty string');
  });
});

describe.skipIf(Boolean(process.env.INTEGRATION_TESTS))('getBibleStylesheets', () => {
  it('returns stable assets and respects a custom API host', () => {
    expect(
      getBibleStylesheets({ appKey: 'key +/reserved', apiHost: 'api-staging.youversion.com' }),
    ).toEqual([
      {
        kind: 'bible',
        rel: 'stylesheet',
        href: BIBLE_CSS_STYLESHEET_URL,
      },
      {
        kind: 'font',
        rel: 'stylesheet',
        href: 'https://api-staging.youversion.com/v1/fonts/1/stylesheet?app_key=key%20%2B%2Freserved',
      },
    ]);
  });
});
