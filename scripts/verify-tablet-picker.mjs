import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(new URL('../packages/ui/package.json', import.meta.url));
const { chromium } = require('playwright');
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5173';
const output = path.resolve(process.argv[3] ?? '/tmp/reader-tablet-picker-verification');
const upstreamFile = process.argv[4];
const upstreamSource = upstreamFile ? JSON.parse(await readFile(upstreamFile, 'utf8')) : null;
const upstreamEntries = upstreamSource
  ? Object.fromEntries(
      Object.entries(upstreamSource).map(([key, value]) => [key, value.message ?? value]),
    )
  : null;
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
const results = [];

await mkdir(output, { recursive: true });

try {
  const page = await browser.newPage();
  await page.goto(baseUrl);
  const opener = page.getByRole('button', { name: 'Change Bible version', exact: true });
  await opener.waitFor();

  if (upstreamEntries) {
    const dist = path.join(repoRoot, 'packages/ui/dist');
    let i18nChunk;
    for (const filename of await readdir(dist)) {
      if (!filename.endsWith('.js')) continue;
      const content = await readFile(path.join(dist, filename), 'utf8');
      if (/export \{[^}]*\bi18n_default\b/.test(content)) {
        i18nChunk = path.join(dist, filename);
        break;
      }
    }
    assert(i18nChunk, 'The built SDK exposes its i18n chunk for the copy preview');
    await page.evaluate(
      async ({ moduleUrl, entries }) => {
        const { i18n_default: i18n } = await import(moduleUrl);
        i18n.addResourceBundle('en', 'translation', entries, true, true);
        await i18n.changeLanguage('en');
      },
      { moduleUrl: `/@fs${i18nChunk}`, entries: upstreamEntries },
    );
  }

  const card = page.locator('[data-slot="popover-content"]');
  for (const viewport of [
    { name: 'portrait', width: 834, height: 1194 },
    { name: 'landscape', width: 1180, height: 820 },
    { name: 'narrow', width: 375, height: 812 },
    { name: 'short', width: 820, height: 400 },
  ]) {
    await page.setViewportSize(viewport);
    await opener.click();
    await card.waitFor();
    await card.evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((animation) => animation.finished));
    });
    const box = await card.boundingBox();
    assert(box, `${viewport.name} card is visible`);
    assert(Math.abs(box.width - Math.min(400, viewport.width - 32)) <= 1);
    assert(box.height <= Math.min(600, viewport.height - 32) + 1);
    if (viewport.name === 'portrait' || viewport.name === 'landscape') {
      assert(Math.abs(box.height - 600) <= 1);
    }
    if (upstreamEntries) {
      assert.equal(
        await card.locator('input').getAttribute('placeholder'),
        upstreamEntries.searchVersions,
      );
    }
    assert(box.x >= 15 && box.x + box.width <= viewport.width - 15);
    assert(box.y >= 15 && box.y + box.height <= viewport.height - 15);
    const overflow = await card.evaluate((element) => element.scrollWidth > element.clientWidth);
    assert(!overflow, `${viewport.name} card has no horizontal overflow`);
    await card.screenshot({ path: path.join(output, `${viewport.name}-versions.png`) });
    results.push({ ...viewport, box, headings: await card.locator('h2,h3').allTextContents() });
    await page.keyboard.press('Escape');
    await card.waitFor({ state: 'hidden' });
  }

  await page.setViewportSize({ width: 834, height: 1194 });
  await opener.click();
  await card.getByRole('button', { name: /^Language\b/ }).click();
  await card.getByRole('tab', { name: 'Suggested', exact: true }).waitFor();
  await card.screenshot({
    path: path.join(output, 'portrait-languages.png'),
    animations: 'disabled',
  });
  await card.locator('[data-slot="language-search-open"]').click();
  const search = card.getByRole('textbox', { name: 'Search languages', exact: true });
  await search.waitFor();
  await search.fill('Spanish');
  await card
    .getByRole('listitem', { name: /Spanish/i })
    .first()
    .waitFor();
  const searchResults = await card.getByRole('listitem').allTextContents();
  assert(
    searchResults.every((text) => /Spanish/i.test(text)),
    'Search excludes nonmatching languages',
  );
  await card.screenshot({ path: path.join(output, 'portrait-language-search.png') });
  results.push({ searchResults });
  await card.locator('[data-slot="language-back"]').click();
  await card.getByRole('tab', { name: 'Suggested', exact: true }).waitFor();
  await card.locator('[data-slot="language-back"]').click();
  await card.getByRole('textbox', { name: 'Search Bible versions', exact: true }).waitFor();
  await card.getByRole('button', { name: /^Language\b/ }).click();
  await card.getByRole('listitem', { name: /América Latina/ }).click();
  await card.locator('[data-testid="version-list"] h3').waitFor();
  await page.waitForFunction(() =>
    document.querySelector('[data-testid="version-list"] h3')?.textContent.includes('América'),
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForFunction(() => {
    const element = document.querySelector('[data-slot="popover-content"]');
    return element && Math.abs(element.getBoundingClientRect().width - 343) <= 1;
  });
  assert(
    await card.evaluate((element) => element.scrollWidth <= element.clientWidth),
    'The narrow card has no horizontal overflow with a long language name',
  );
  const heading = card.locator('[data-testid="version-list"] h3');
  const headingBox = await heading.boundingBox();
  const badgeBox = await heading.locator(':scope > span').last().boundingBox();
  assert(headingBox && badgeBox, 'The long language heading and count are visible');
  assert(badgeBox.x + badgeBox.width <= headingBox.x + headingBox.width - 15);
  await card.screenshot({ path: path.join(output, 'narrow-long-language.png') });
  results.push({ longLanguageHeading: await heading.textContent(), badgeBox });
  await card.locator('[data-testid="version-list"]').getByRole('listitem').first().click();
  await card.waitFor({ state: 'hidden' });
  results.push({ searchAndBackNavigation: 'pass', versionSelectionClosesPicker: 'pass' });
  await writeFile(path.join(output, 'verification.json'), `${JSON.stringify(results, null, 2)}\n`);
  console.log(
    JSON.stringify({ result: 'pass', upstreamCopyPreview: Boolean(upstreamFile), output, results }),
  );
} finally {
  await browser.close();
}
