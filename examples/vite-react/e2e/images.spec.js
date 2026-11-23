import { test, expect } from 'playwright/test';

const art = (id, passage = 'JHN.3.16') => ({
  id,
  passage_id: passage,
  image_url: `https://art.test/${id}.svg`,
  attribution: `Artist ${id}`,
  language_tag: 'en',
  width: 800,
  height: 1000,
  aspect_ratio: 0.8,
});

async function settleResponse(page, response) {
  await (await response).finished();
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

async function setup(page, handle, path = '/') {
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ contentType: 'text/css', body: '' }),
  );
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('https://api.youversion.test/**', async (route) => {
    const url = new URL(route.request().url());
    const response = await handle(url);
    await route.fulfill({ status: response.status ?? 200, json: response.body ?? response });
  });
  await page.route('https://art.test/**', (route) => {
    const id = new URL(route.request().url()).pathname.slice(1).replace('.svg', '');
    const width = id === 'landscape' ? 1200 : id === 'portrait' ? 600 : 800;
    const height = id === 'landscape' ? 600 : id === 'portrait' ? 1200 : 1000;
    const color =
      id === 'a' || id === 'landscape'
        ? '#176c68'
        : id === 'b' || id === 'portrait'
          ? '#874044'
          : '#225875';
    return route.fulfill({
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${color}"/><text x="40" y="${height / 2}" fill="white" font-size="36">Artwork ${id}</text></svg>`,
    });
  });
  await page.goto(path);
  if (path === '/')
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Content', exact: true })
      .click();
}

test('browse, recover a later page, search in server order and clear', async ({ page }) => {
  let failed = false;
  const { promise: laterMetadata, resolve: releaseMetadata } = Promise.withResolvers();
  await setup(page, async (url) => {
    if (url.pathname === '/v1/images') {
      if (url.searchParams.has('page_token')) {
        if (url.searchParams.get('page_token') !== 'next')
          return { status: 400, body: { message: 'Wrong cursor' } };
        if (!failed) {
          failed = true;
          return { status: 503, body: { message: 'Later page failed' } };
        }
        return { data: [art('a'), art('c')], next_page_token: null };
      }
      return { data: [art('a'), art('b')], next_page_token: 'next' };
    }
    if (url.pathname === '/v1/bibles')
      return {
        data: [version(1), version(3034)],
        next_page_token: null,
      };
    if (url.pathname === '/v1/search-images') {
      if (url.searchParams.get('bible_id') !== '3034') return { images: [], next_page_token: null };
      return {
        images: [
          { id: 'second', passage_id: 'JHN.3.16' },
          { id: 'first', passage_id: 'JHN.3.16' },
        ],
        next_page_token: null,
      };
    }
    if (url.pathname === '/v1/images/second') await laterMetadata;
    if (url.pathname.startsWith('/v1/images/')) return art(url.pathname.split('/').at(-1));
    return detailResponses(url);
  });
  const grid = page.getByRole('list', { name: 'Verse images' });
  await expect(grid.getByRole('button', { name: 'Open JHN.3.16' })).toHaveCount(2);
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(grid.getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(grid.getByRole('listitem')).toHaveCount(3);
  await page.screenshot({ path: test.info().outputPath('grid.png'), fullPage: true });
  await page.getByRole('searchbox', { name: 'Search images' }).fill('love');
  const firstMetadata = page.waitForResponse((response) =>
    response.url().endsWith('/v1/images/first'),
  );
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await (await firstMetadata).finished();
  releaseMetadata();
  await expect(grid.getByRole('listitem')).toHaveCount(2);
  await expect(grid.locator('img').first()).toHaveAttribute('src', /second/);
  await expect(grid.locator('img').nth(1)).toHaveAttribute('src', /first/);
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(grid.locator('img').first()).toHaveAttribute('src', /\/a\.svg/);
});

test('language selection, partial search retries, empty cursors and obsolete searches', async ({
  page,
}) => {
  let missing = true;
  const { promise: oldStarted, resolve: oldRequested } = Promise.withResolvers();
  const { promise: oldGate, resolve: releaseOld } = Promise.withResolvers();
  await setup(page, async (url) => {
    if (url.pathname === '/v1/bibles') {
      const tag = url.searchParams.get('language_ranges[]');
      return {
        data: [{ id: tag === 'es' ? 100 : 3034, language_tag: tag, books: ['JHN'] }],
        next_page_token: null,
      };
    }
    if (url.pathname === '/v1/images')
      return {
        data: [art(url.searchParams.get('language_ranges[]') === 'es' ? 'spanish' : 'english')],
        next_page_token: null,
      };
    if (url.pathname === '/v1/search-images') {
      const query = url.searchParams.get('query');
      if (query === 'old') {
        oldRequested();
        await oldGate;
        return { images: [{ id: 'obsolete', passage_id: 'JHN.3.16' }], next_page_token: null };
      }
      if (url.searchParams.has('page_token')) {
        if (url.searchParams.get('page_token') !== '')
          return { status: 400, body: { message: 'Wrong search cursor' } };
        return { images: [{ id: 'last', passage_id: 'JHN.3.16' }], next_page_token: null };
      }
      return {
        images: [
          { id: 'missing', passage_id: 'JHN.3.16' },
          { id: 'retained', passage_id: 'JHN.3.16' },
        ],
        next_page_token: '',
      };
    }
    if (url.pathname === '/v1/images/missing' && missing)
      return { status: 503, body: { message: 'Missing metadata' } };
    if (url.pathname.startsWith('/v1/images/')) return art(url.pathname.split('/').at(-1));
    return { data: [], next_page_token: null };
  });
  await page.getByRole('button', { name: 'Content language' }).click();
  await page.getByRole('searchbox', { name: 'Search languages' }).fill('es');
  await page.getByRole('button', { name: 'Spanish', exact: true }).click();
  const grid = page.getByRole('list', { name: 'Verse images' });
  await expect(grid.locator('img').first()).toHaveAttribute('src', /spanish/);
  await page.getByRole('searchbox', { name: 'Search images' }).fill('love');
  const searchResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/v1/search-images') && response.url().includes('bible_id=100'),
  );
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await searchResponse;
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(grid.locator('img')).toHaveCount(1);
  missing = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(grid.locator('img')).toHaveCount(2);
  await expect(grid.locator('img').first()).toHaveAttribute('src', /missing/);
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(grid.locator('img')).toHaveCount(3);
  await page.getByRole('searchbox', { name: 'Search images' }).fill('old');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await oldStarted;
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(grid.locator('img').first()).toHaveAttribute('src', /spanish/);
  const oldResponse = page.waitForResponse(
    (response) => response.url().includes('/search-images') && response.url().includes('query=old'),
  );
  releaseOld();
  await settleResponse(page, oldResponse);
  await expect(grid.locator('img').first()).toHaveAttribute('src', /spanish/);
});

const version = (id = 3034, language = 'en') => ({
  id,
  language_tag: language,
  books: ['JHN'],
  abbreviation: 'BSB',
  localized_abbreviation: 'BSB',
  title: 'Test Bible',
  localized_title: 'Test Bible',
  copyright: 'Test copyright',
  youversion_deep_link: 'https://bible.com/versions/3034',
});

async function detailResponses(url) {
  if (url.pathname === '/v1/images')
    return {
      data: url.searchParams.has('passage_id') ? [art('a'), art('b'), art('c')] : [art('a')],
      next_page_token: null,
    };
  if (url.pathname === '/v1/bibles') return { data: [version()], next_page_token: null };
  if (/\/v1\/bibles\/\d+$/.test(url.pathname)) return version();
  if (url.pathname.includes('/passages/'))
    return {
      id: 'JHN.3.16',
      reference: 'John 3:16',
      content:
        '<p class="p"><span class="verse" data-usfm="JHN.3.16"><span class="content">For God so loved the world.</span></span></p>',
    };
  return { data: [], next_page_token: null };
}

test('shuffle, share the selected artwork, view scripture and return to the loaded grid', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.sharedImages = [];
    Object.defineProperty(navigator, 'share', {
      value: async (data) => {
        window.sharedImages.push(data.url);
      },
    });
  });
  await setup(page, detailResponses);
  await page.getByRole('button', { name: 'Open JHN.3.16' }).click();
  await expect(page.getByText('1 of 3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next image', exact: true }).click();
  await expect(page.getByText('2 of 3', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = 180;
    }
  });
  await page.screenshot({ path: test.info().outputPath('shuffle-out.png') });
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) animation.currentTime = 350;
  });
  await page.screenshot({ path: test.info().outputPath('shuffle-return.png') });
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) animation.finish();
  });
  await page.getByRole('button', { name: 'Share image', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.sharedImages))
    .toEqual(['https://art.test/b.svg']);
  const selected = page.getByRole('button', { name: 'View full-screen image' });
  await expect(page.getByRole('button', { name: 'Next image', exact: true })).toBeEnabled();
  const box = await selected.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 160, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByText('3 of 3', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Next image', exact: true })).toBeEnabled();
  await selected.click();
  const dialog = page.getByRole('dialog', { name: 'Verse image' });
  await expect(dialog.getByText('Artist c', { exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('viewer.png') });
  await expect(dialog.getByText('For God so loved the world.', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Read in Bible' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Share image', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.sharedImages))
    .toEqual(['https://art.test/b.svg', 'https://art.test/c.svg']);
  await page.keyboard.press('Escape');
  await expect(selected).toBeFocused();
  await page.getByRole('button', { name: 'Back to images' }).click();
  await expect(page.getByRole('list', { name: 'Verse images' }).getByRole('listitem')).toHaveCount(
    1,
  );
});

test('recover artwork, later stack pages and a shorter retry; share without native sharing', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    delete Navigator.prototype.share;
  });
  let nextFails = true;
  let shorter = false;
  await setup(page, async (url) => {
    if (url.pathname === '/v1/images' && url.searchParams.has('passage_id')) {
      if (url.searchParams.has('page_token')) {
        if (nextFails) return { status: 503, body: { message: 'Stack page failed' } };
        return { data: [art('b'), art('c')], next_page_token: 'more-art' };
      }
      return { data: shorter ? [] : [art('b')], next_page_token: shorter ? null : 'more-art' };
    }
    return detailResponses(url);
  });
  await page.route('https://art.test/b.svg*', (route) => route.abort());
  await page.getByRole('button', { name: 'Open JHN.3.16' }).click();
  await expect(page.getByRole('button', { name: 'Retry artwork list' })).toBeVisible();
  await expect(page.getByText('1 of 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next image' }).click();
  await expect(page.getByRole('button', { name: 'Retry artwork', exact: true })).toBeVisible();
  await page.unroute('https://art.test/b.svg*');
  await page.getByRole('button', { name: 'Retry artwork', exact: true }).click();
  await expect(page.locator('.image-stack-selected img')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open image link' })).toHaveAttribute(
    'href',
    'https://art.test/b.svg',
  );
  nextFails = false;
  await page.getByRole('button', { name: 'Retry artwork list' }).click();
  await expect(page.getByText('2 of 3', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry artwork list' })).toBeVisible();
  shorter = true;
  await page.getByRole('button', { name: 'Retry artwork list' }).click();
  await expect(page.getByText('1 of 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open image link' })).toHaveAttribute(
    'href',
    'https://art.test/a.svg',
  );
  await expect(page.locator('.image-stack-flight')).toHaveCount(0);
});

test('read callback uses a permitted Bible, and failed passage text can be retried', async ({
  page,
}) => {
  let passageFails = true;
  await setup(
    page,
    async (url) => {
      if (url.pathname === '/v1/bibles')
        return {
          data: [version(3034), { ...version(100), books: ['GEN'] }, version(500)],
          next_page_token: null,
        };
      if (url.pathname === '/v1/bibles/500') return version(500);
      if (url.pathname.includes('/passages/') && passageFails)
        return { status: 503, body: { message: 'Passage unavailable' } };
      return detailResponses(url);
    },
    '/e2e/image-library.html?restrict',
  );
  await page.getByRole('button', { name: 'Open JHN.3.16' }).click();
  await page.getByRole('button', { name: 'View full-screen image' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toBeVisible();
  passageFails = false;
  await dialog.getByRole('button', { name: 'Retry passage' }).click();
  await expect(dialog.getByText('For God so loved the world.', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Read in Bible' }).click();
  await expect(page.getByRole('status', { name: 'Requested Bible passage' })).toHaveText(
    '500:JHN.3.16',
  );
});

test('Chinese fallback, no available Bible, query validation and empty search recovery', async ({
  page,
}) => {
  await setup(page, async (url) => {
    if (url.pathname === '/v1/images') return { data: [art('available')], next_page_token: null };
    if (url.pathname === '/v1/bibles')
      return {
        data: url.searchParams.get('language_ranges[]') === 'zh' ? [version(900, 'zh')] : [],
        next_page_token: null,
      };
    if (url.pathname === '/v1/search-images') return { images: [], next_page_token: null };
    return { data: [], next_page_token: null };
  });
  const search = page.getByRole('searchbox', { name: 'Search images' });
  await search.fill('a'.repeat(101));
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Verse images' }).getByRole('listitem')).toHaveCount(
    1,
  );
  await page.getByRole('button', { name: 'Clear search' }).click();
  await page.getByRole('button', { name: 'Content language' }).click();
  await page.getByRole('button', { name: 'Chinese (China)', exact: true }).click();
  await search.fill('love');
  const response = page.waitForResponse(
    (result) => result.url().includes('/search-images') && result.url().includes('bible_id=900'),
  );
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await response;
  await expect(page.getByRole('status', { name: 'Empty image results' })).toBeVisible();
  await page.getByRole('button', { name: 'Content language' }).click();
  await page.getByRole('button', { name: 'Spanish', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.getByRole('list', { name: 'Verse images' }).getByRole('listitem')).toHaveCount(
    1,
  );
});

test('language changes invalidate pending browse work; initial errors and empty pages recover', async ({
  page,
}) => {
  const { promise: gate, resolve: release } = Promise.withResolvers();
  let failed = true;
  await setup(page, async (url) => {
    if (url.pathname === '/v1/images') {
      if (url.searchParams.get('language_ranges[]') === 'en') {
        await gate;
        return { data: [art('old-english')], next_page_token: null };
      }
      if (failed) return { status: 503, body: { message: 'First page unavailable' } };
      return { data: [], next_page_token: null };
    }
    return { data: [], next_page_token: null };
  });
  await expect(page.getByRole('status')).toContainText('Loading images');
  await page.getByRole('button', { name: 'Content language' }).click();
  await page.getByRole('button', { name: 'Spanish', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  failed = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Empty image results' })).toBeVisible();
  const oldResponse = page.waitForResponse((response) =>
    response.url().includes('language_ranges%5B%5D=en'),
  );
  release();
  await settleResponse(page, oldResponse);
  await expect(page.getByRole('list', { name: 'Verse images' }).getByRole('listitem')).toHaveCount(
    0,
  );
});

test('narrow touch layout and keyboard viewer controls remain usable', async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5178',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  try {
    await setup(page, detailResponses);
    await expect(
      page.getByRole('list', { name: 'Verse images' }).getByRole('listitem'),
    ).toHaveCount(1);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.getByRole('button', { name: 'Open JHN.3.16' }).tap();
    await expect(page.getByText('1 of 3', { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 500 });
    const touchCard = page.getByRole('button', { name: 'View full-screen image' });
    await touchCard.scrollIntoViewIfNeeded();
    const cardBox = await touchCard.boundingBox();
    const beforeScroll = await page
      .locator('[data-active-screen="true"]')
      .evaluate((element) => element.scrollTop);
    const touch = await context.newCDPSession(page);
    const startY = Math.min(420, cardBox.y + cardBox.height - 30);
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 195, y: startY }],
    });
    for (const dy of [30, 60, 100, 150])
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 195, y: startY - dy }],
      });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect
      .poll(() =>
        page.locator('[data-active-screen="true"]').evaluate((element) => element.scrollTop),
      )
      .toBeGreaterThan(beforeScroll);
    await expect(page.getByText('1 of 3', { exact: true })).toBeVisible();
    await touch.detach();
    await page.setViewportSize({ width: 390, height: 844 });
    const next = page.getByRole('button', { name: 'Next image', exact: true });
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('2 of 3', { exact: true })).toBeVisible();
    const viewer = page.getByRole('button', { name: 'View full-screen image' });
    await viewer.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('dialog').getByText('For God so loved the world.', { exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('mobile-viewer.png') });
    await page.keyboard.press('Escape');
    await expect(viewer).toBeFocused();
  } finally {
    await context.close();
  }
});

test('leaving a detail view rejects its pending artwork', async ({ page }) => {
  const { promise: gate, resolve: release } = Promise.withResolvers();
  await setup(page, async (url) => {
    if (url.pathname === '/v1/images') {
      if (url.searchParams.get('passage_id') === 'JHN.3.16') {
        await gate;
        return { data: [art('obsolete')], next_page_token: null };
      }
      if (url.searchParams.has('passage_id'))
        return { data: [art('other', 'JHN.3.17')], next_page_token: null };
      return { data: [art('a'), art('d', 'JHN.3.17')], next_page_token: null };
    }
    return detailResponses(url);
  });
  await page.getByRole('button', { name: 'Open JHN.3.16' }).click();
  await expect(page.getByText('1 of 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to images' }).click();
  await page.getByRole('button', { name: 'Open JHN.3.17' }).click();
  await expect(page.getByText('1 of 2', { exact: true })).toBeVisible();
  const oldResponse = page.waitForResponse((response) =>
    response.url().includes('passage_id=JHN.3.16'),
  );
  release();
  await oldResponse;
  await expect(page.locator('.image-stack-selected img')).toHaveAttribute('src', /\/d\.svg/);
  await expect(page.getByText('1 of 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Image detail' }).getByRole('img')).toHaveCount(1);
});

test('restore a long grid and render previews in the selected content language', async ({
  page,
}) => {
  await setup(page, async (url) => {
    const tag = url.searchParams.get('language_ranges[]') ?? 'en';
    if (url.pathname === '/v1/images')
      return {
        data: url.searchParams.has('passage_id')
          ? []
          : Array.from({ length: 24 }, (_, index) => art(`image-${index}`)),
        next_page_token: null,
      };
    if (url.pathname === '/v1/bibles')
      return {
        data: [version(tag === 'es' ? 100 : tag === 'fr' ? 200 : 3034, tag)],
        next_page_token: null,
      };
    if (/\/v1\/bibles\/\d+$/.test(url.pathname)) {
      const id = Number(url.pathname.split('/').at(-1));
      return version(id, id === 100 ? 'es' : id === 200 ? 'fr' : 'en');
    }
    if (url.pathname.includes('/passages/'))
      return {
        id: 'JHN.3.16',
        reference: 'John 3:16',
        content: `<p>${url.pathname.includes('/100/') ? 'Dios amó al mundo.' : url.pathname.includes('/200/') ? 'Dieu a aimé le monde.' : 'Wrong Bible version.'}</p>`,
      };
    return { data: [], next_page_token: null };
  });
  const last = page.getByRole('button', { name: 'Open JHN.3.16' }).last();
  await last.scrollIntoViewIfNeeded();
  const position = await page
    .locator('[data-active-screen="true"]')
    .evaluate((element) => element.scrollTop);
  expect(position).toBeGreaterThan(0);
  await last.click();
  await expect(page.getByText('1 of 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to images' }).click();
  await expect
    .poll(() =>
      page.locator('[data-active-screen="true"]').evaluate((element) => element.scrollTop),
    )
    .toBe(position);
  await expect(last).toBeFocused();
  for (const [language, text] of [
    ['Spanish', 'Dios amó al mundo.'],
    ['French', 'Dieu a aimé le monde.'],
  ]) {
    await page.getByRole('button', { name: 'Content language' }).click();
    await page.getByRole('button', { name: language, exact: true }).click();
    await page.getByRole('button', { name: 'Open JHN.3.16' }).first().click();
    await page.getByRole('button', { name: 'View full-screen image' }).click();
    await expect(page.getByRole('dialog').getByText(text, { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Back to images' }).click();
  }
});

test('a retry failing on an earlier stack page preserves loaded cards and selection', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    delete Navigator.prototype.share;
  });
  let attempt = 0;
  await setup(page, async (url) => {
    if (url.pathname === '/v1/images' && url.searchParams.has('passage_id')) {
      const token = url.searchParams.get('page_token');
      if (attempt === 2) return { data: [], next_page_token: null };
      if (token === 'third' || (attempt === 1 && token === 'second'))
        return { status: 503, body: { message: 'Stack page failed' } };
      return token === 'second'
        ? { data: [art('c')], next_page_token: 'third' }
        : { data: [art('b')], next_page_token: 'second' };
    }
    return detailResponses(url);
  });
  await page.getByRole('button', { name: 'Open JHN.3.16' }).click();
  await expect(page.getByRole('button', { name: 'Retry artwork list' })).toBeVisible();
  await page.getByRole('button', { name: 'Next image' }).click();
  await page.getByRole('button', { name: 'Next image' }).click();
  await expect(page.getByText('3 of 3', { exact: true })).toBeVisible();
  attempt = 1;
  const failedPage = page.waitForResponse(
    (response) => response.url().includes('page_token=second') && response.status() === 503,
  );
  await page.getByRole('button', { name: 'Retry artwork list' }).click();
  await (await failedPage).finished();
  await expect(page.getByRole('button', { name: 'Retry artwork list' })).toBeVisible();
  await expect(page.getByText('3 of 3', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open image link' })).toHaveAttribute(
    'href',
    'https://art.test/c.svg',
  );
  attempt = 2;
  await page.getByRole('button', { name: 'Retry artwork list' }).click();
  await expect(page.getByText('1 of 1', { exact: true })).toBeVisible();
});

test('artwork works without URL.canParse and malformed passage metadata cannot navigate', async ({
  page,
}) => {
  await page.addInitScript(() => {
    delete URL.canParse;
  });
  await setup(
    page,
    async (url) => {
      if (url.pathname === '/v1/images')
        return { data: [art('bad', 'JHN.bad')], next_page_token: null };
      return detailResponses(url);
    },
    '/e2e/image-library.html',
  );
  await page.getByRole('button', { name: 'Open JHN.bad' }).click();
  await page.getByRole('button', { name: 'View full-screen image' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Read in Bible' }),
  ).toBeDisabled();
});

test('mixed-aspect cards stay bounded and a drag preserves the loaded outgoing artwork', async ({
  page,
}) => {
  const landscape = { ...art('landscape'), width: 1200, height: 600, aspect_ratio: 2 };
  const portrait = { ...art('portrait'), width: 600, height: 1200, aspect_ratio: 0.5 };
  await setup(page, async (url) => {
    if (url.pathname === '/v1/images')
      return {
        data: url.searchParams.has('passage_id') ? [landscape, portrait] : [landscape],
        next_page_token: null,
      };
    return detailResponses(url);
  });
  await page.getByRole('button', { name: 'Open JHN.3.16' }).click();
  await expect(page.getByText('1 of 2', { exact: true })).toBeVisible();
  const bounds = await page.locator('.image-stack').boundingBox();
  for (const artwork of await page.locator('.image-stack img').all()) {
    const box = await artwork.boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(bounds.y + bounds.height);
  }
  const viewer = page.getByRole('button', { name: 'View full-screen image' });
  await viewer.scrollIntoViewIfNeeded();
  const box = await viewer.boundingBox();
  const outgoing = await page.locator('.image-stack-selected img').elementHandle();
  await expect(page.locator('.image-stack-selected img')).toBeVisible();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 110, box.y + box.height / 2, { steps: 8 });
  const released = await page.locator('.image-stack-selected').boundingBox();
  await page.mouse.up();
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = 0;
    }
  });
  expect(await outgoing.evaluate((node) => node.isConnected)).toBe(true);
  const flight = await page.locator('.image-stack-flight').boundingBox();
  expect(Math.abs(flight.x - released.x)).toBeLessThan(3);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.screenshot({ path: test.info().outputPath('drag-release.png') });
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) animation.finish();
  });
  await expect(page.getByText('2 of 2', { exact: true })).toBeVisible();
});

test('Content image routes preserve the grid through detail history and direct links', async ({
  page,
}) => {
  await setup(page, async (url) => {
    if (url.pathname.startsWith('/v1/images/'))
      return art(decodeURIComponent(url.pathname.split('/').at(-1)));
    return detailResponses(url);
  });
  const content = page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'Content' });
  await expect(page).toHaveURL(/#\/content$/);
  await page.getByRole('button', { name: 'Open JHN.3.16' }).click();
  await expect(page).toHaveURL(/#\/content\/image\/a$/);
  await expect(page.getByRole('region', { name: 'Image detail' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('list', { name: 'Verse images' }).getByRole('listitem')).toHaveCount(
    1,
  );
  await page.goForward();
  await expect(page.getByRole('region', { name: 'Image detail' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to images' }).click();
  await expect(page).toHaveURL(/#\/content$/);
  await page.goto('/#/content/image/opaque%2Fa%20b');
  await expect(page.getByRole('region', { name: 'Image detail' })).toBeVisible();
  await expect(page.locator('.image-stack-selected img')).toHaveAttribute('src', /opaque/);
  await content.click();
  await expect(page).toHaveURL(/#\/content$/);
});

async function readerResponses(url) {
  const id = Number(url.pathname.split('/')[3]);
  const chapter = { id: '3', passage_id: 'JHN.3', title: '3' };
  const book = {
    id: 'JHN',
    title: 'John',
    full_title: 'John',
    abbreviation: 'Jn',
    canon: 'new_testament',
    chapters: [{ id: '1', passage_id: 'JHN.1', title: '1' }, chapter],
  };
  if (/\/v1\/bibles\/\d+$/.test(url.pathname))
    return {
      ...version(id, id === 500 ? 'es' : 'en'),
      localized_abbreviation: id === 500 ? 'ESP' : 'BSB',
    };
  if (url.pathname.endsWith('/books')) return { data: [book], next_page_token: null };
  if (url.pathname.endsWith('/books/JHN')) return book;
  if (url.pathname.endsWith('/chapters')) return { data: book.chapters, next_page_token: null };
  if (url.pathname.includes('/chapters/')) return chapter;
  if (url.pathname.includes('/passages/')) {
    const passage = url.pathname.split('/').at(-1);
    return {
      id: passage,
      reference: 'John 3',
      content: `<p class="p"><span class="verse" data-usfm="JHN.3.16"><span class="label">16</span><span class="content">Reader passage ${id} ${passage}</span></span></p>`,
    };
  }
  return detailResponses(url);
}

test('Read in Bible uses the selected language and preserves loaded Content state on return', async ({
  page,
}) => {
  await setup(page, async (url) => {
    if (url.pathname === '/v1/images') return { data: [art('spanish')], next_page_token: null };
    if (url.pathname.startsWith('/v1/images/')) return art(url.pathname.split('/').at(-1));
    if (url.pathname === '/v1/bibles')
      return {
        data: [
          version(
            url.searchParams.get('language_ranges[]') === 'es' ? 500 : 3034,
            url.searchParams.get('language_ranges[]') ?? 'en',
          ),
        ],
        next_page_token: null,
      };
    if (url.pathname === '/v1/search-images')
      return {
        images: [
          { id: url.searchParams.has('page_token') ? 'later' : 'spanish', passage_id: 'JHN.3.16' },
        ],
        next_page_token: url.searchParams.has('page_token') ? null : 'more',
      };
    return readerResponses(url);
  });
  await page.getByRole('button', { name: 'Content language' }).click();
  await page.getByRole('button', { name: 'Spanish', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search images' }).fill('amor');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Verse images' }).getByRole('listitem')).toHaveCount(
    2,
  );
  await page.getByRole('button', { name: 'Open JHN.3.16' }).first().click();
  await page.getByRole('button', { name: 'View full-screen image' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Read in Bible' }).click();
  await expect(page).toHaveURL(/#\/bible$/);
  await expect(
    page
      .locator('[data-active-screen="true"]')
      .getByText('Reader passage 500 JHN.3', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/#\/content\/image\/spanish$/);
  await page.getByRole('button', { name: 'Back to images' }).click();
  await expect(page.getByRole('searchbox', { name: 'Search images' })).toHaveValue('amor');
  await expect(
    page.getByRole('button', { name: 'Content language: Spanish', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('list', { name: 'Verse images' }).getByRole('listitem')).toHaveCount(
    2,
  );
  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'Profile' })
    .click();
  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'Content' })
    .click();
  await expect(page.getByRole('searchbox', { name: 'Search images' })).toHaveValue('amor');
  await expect(page.getByRole('list', { name: 'Verse images' }).getByRole('listitem')).toHaveCount(
    2,
  );
});

test('cold image links open Bible before its first mount, and hidden Content closes its dialogs', async ({
  page,
}) => {
  await setup(
    page,
    async (url) => {
      if (url.pathname.startsWith('/v1/images/')) return art('cold');
      if (url.pathname === '/v1/bibles') return { data: [version()], next_page_token: null };
      return readerResponses(url);
    },
    '/#/content/image/cold',
  );
  await page.getByRole('button', { name: 'View full-screen image' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Read in Bible' }).click();
  await expect(page).toHaveURL(/#\/bible$/);
  await expect(
    page
      .locator('[data-active-screen="true"]')
      .getByText('Reader passage 3034 JHN.3', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'Content' })
    .click();
  await page.getByRole('button', { name: 'Content language' }).click();
  await expect(page.getByRole('dialog', { name: 'Content language', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/#\/bible$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goForward();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open JHN.3.16' }).click();
  await page.getByRole('button', { name: 'View full-screen image' }).click();
  await page.evaluate(() => {
    location.hash = '#/profile';
  });
  await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('missing image links recover without a browse result and reject an obsolete detail response', async ({
  page,
}) => {
  let missing = true;
  const { promise: gate, resolve: release } = Promise.withResolvers();
  await setup(
    page,
    async (url) => {
      if (url.pathname === '/v1/images') return { data: [], next_page_token: null };
      if (url.pathname === '/v1/images/missing')
        return missing ? { status: 404, body: { message: 'Missing image' } } : art('missing');
      if (url.pathname === '/v1/images/slow') {
        await gate;
        return art('obsolete');
      }
      return detailResponses(url);
    },
    '/#/content/image/missing',
  );
  const detail = page.getByRole('region', { name: 'Image detail' });
  await expect(detail.getByRole('alert')).toContainText('404');
  missing = false;
  await detail.getByRole('button', { name: 'Retry image details' }).click();
  await expect(page.locator('.image-stack-selected img')).toHaveAttribute('src', /missing/);
  const slowStarted = page.waitForRequest((request) => request.url().endsWith('/v1/images/slow'));
  await page.evaluate(() => {
    location.hash = '#/content/image/slow';
  });
  await slowStarted;
  await page.goBack();
  await expect(page.locator('.image-stack-selected img')).toHaveAttribute('src', /missing/);
  const oldResponse = page.waitForResponse((response) =>
    response.url().endsWith('/v1/images/slow'),
  );
  release();
  await settleResponse(page, oldResponse);
  await expect(page.locator('.image-stack-selected img')).toHaveAttribute('src', /missing/);
});

test('returning to Content resumes an interrupted page without applying the hidden response', async ({
  page,
}) => {
  const { promise: gate, resolve: release } = Promise.withResolvers();
  let pageRequests = 0;
  await setup(page, async (url) => {
    if (url.pathname === '/v1/images') {
      if (!url.searchParams.has('page_token')) return { data: [art('a')], next_page_token: 'more' };
      pageRequests += 1;
      if (pageRequests === 1) {
        await gate;
        return { data: [art('obsolete')], next_page_token: null };
      }
      return { data: [art('b')], next_page_token: null };
    }
    return detailResponses(url);
  });
  const started = page.waitForRequest((request) => request.url().includes('page_token=more'));
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await started;
  const nav = page.getByRole('navigation', { name: 'Primary' });
  await nav.getByRole('link', { name: 'Profile' }).click();
  await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
  const oldResponse = page.waitForResponse((response) =>
    response.url().includes('page_token=more'),
  );
  release();
  await settleResponse(page, oldResponse);
  await nav.getByRole('link', { name: 'Content' }).click();
  const grid = page.getByRole('list', { name: 'Verse images' });
  await expect(grid.getByRole('listitem')).toHaveCount(2);
  await expect(grid.locator('img').nth(1)).toHaveAttribute('src', /\/b\.svg/);
});
