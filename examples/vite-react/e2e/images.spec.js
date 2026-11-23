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

async function setup(page, handle, path = '/') {
  await page.route('https://api.youversion.test/**', async (route) => {
    const url = new URL(route.request().url());
    const response = await handle(url);
    await route.fulfill({ status: response.status ?? 200, json: response.body ?? response });
  });
  await page.route('https://art.test/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#176c68"/><text x="80" y="400" fill="white" font-size="40">Verse artwork</text></svg>',
    }),
  );
  await page.goto(path);
  if (path === '/')
    await page.getByRole('navigation').getByRole('button', { name: 'Images', exact: true }).click();
}

test('browse, recover a later page, search in server order and clear', async ({ page }) => {
  let failed = false;
  await setup(page, async (url) => {
    if (url.pathname === '/v1/images') {
      if (url.searchParams.has('page_token')) {
        if (!failed) {
          failed = true;
          return { status: 503, body: { message: 'Later page failed' } };
        }
        return { data: [art('a'), art('c')], next_page_token: null };
      }
      return { data: [art('a'), art('b')], next_page_token: 'next' };
    }
    if (url.pathname === '/v1/bibles')
      return { data: [{ id: 3034, language_tag: 'en', books: ['JHN'] }], next_page_token: null };
    if (url.pathname === '/v1/search-images')
      return {
        images: [
          { id: 'second', passage_id: 'JHN.3.16' },
          { id: 'first', passage_id: 'JHN.3.16' },
        ],
        next_page_token: null,
      };
    if (url.pathname.startsWith('/v1/images/')) return art(url.pathname.split('/').at(-1));
    return { data: [], next_page_token: null };
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
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(grid.getByRole('listitem')).toHaveCount(2);
  await expect(grid.locator('img').first()).toHaveAttribute('src', /second/);
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(grid.locator('img').first()).toHaveAttribute('src', /\/a\.svg/);
});

test('language selection, partial search retries, empty cursors and obsolete searches', async ({
  page,
}) => {
  let missing = true;
  let releaseOld;
  let oldRequested;
  const oldStarted = new Promise((resolve) => {
    oldRequested = resolve;
  });
  const oldGate = new Promise((resolve) => {
    releaseOld = resolve;
  });
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
      if (url.searchParams.has('page_token'))
        return { images: [{ id: 'last', passage_id: 'JHN.3.16' }], next_page_token: null };
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
  releaseOld();
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
  await selected.click();
  const dialog = page.getByRole('dialog', { name: 'Verse image' });
  await expect(dialog.getByText('Artist c', { exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('viewer.png') });
  await expect(dialog.getByText('For God so loved the world.', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Read in Bible' })).toBeDisabled();
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
  await expect(page.getByRole('alert')).toBeVisible();
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
  await expect(page.getByRole('alert')).toBeVisible();
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
  await expect(page.getByText('No images found for “love”.')).toBeVisible();
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
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
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
  await expect(page.getByText('No images found.')).toBeVisible();
  release();
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
    await setup(page, detailResponses, '/e2e/image-library.html');
    await expect(
      page.getByRole('list', { name: 'Verse images' }).getByRole('listitem'),
    ).toHaveCount(1);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.getByRole('button', { name: 'Open JHN.3.16' }).tap();
    await expect(page.getByText('1 of 3', { exact: true })).toBeVisible();
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
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
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
  await setup(
    page,
    async (url) => {
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
          content: `<p>${url.pathname.includes('/100/') ? 'Dios amó al mundo.' : 'Dieu a aimé le monde.'}</p>`,
        };
      return { data: [], next_page_token: null };
    },
    '/e2e/image-library.html',
  );
  const last = page.getByRole('button', { name: 'Open JHN.3.16' }).last();
  await last.scrollIntoViewIfNeeded();
  const position = await page.evaluate(() => scrollY);
  expect(position).toBeGreaterThan(0);
  await last.click();
  await expect(page.getByText('1 of 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to images' }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(position);
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
