#!/usr/bin/env node
/**
 * Playwright harness for the YouVersion SDK Demo.
 *
 * Usage (from repo root):
 *   node .cursor/skills/verify-sdk-demo/scripts/drive.mjs doctor
 *   node .cursor/skills/verify-sdk-demo/scripts/drive.mjs bible-reader
 *   node .cursor/skills/verify-sdk-demo/scripts/drive.mjs verse-of-the-day
 *   node .cursor/skills/verify-sdk-demo/scripts/drive.mjs bible-card
 *   node .cursor/skills/verify-sdk-demo/scripts/drive.mjs theme
 *
 * Reads /tmp/verify-sdk-demo/instance.json (or VERIFY_DIR). Writes evidence
 * under ${VERIFY_EVIDENCE_DIR:-$VERIFY_DIR/evidence}/ — never deleted by cleanup.
 */

import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(skillDir, '../../..');
const verifyDir = process.env.VERIFY_DIR || '/tmp/verify-sdk-demo';
const evidenceRoot = process.env.VERIFY_EVIDENCE_DIR || join(verifyDir, 'evidence');
const instanceFile = join(verifyDir, 'instance.json');

const require = createRequire(join(repoRoot, 'packages/ui/package.json'));

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (first) {
    try {
      return require(join(repoRoot, 'node_modules/playwright'));
    } catch {
      throw new Error(
        `Playwright not found via packages/ui. Run pnpm install. (${first instanceof Error ? first.message : first})`,
      );
    }
  }
}

function readInstance() {
  if (!existsSync(instanceFile)) {
    throw new Error(`No instance file at ${instanceFile}. Run scripts/launch.sh first.`);
  }
  return JSON.parse(readFileSync(instanceFile, 'utf8'));
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function evidenceDir(feature) {
  const dir = join(evidenceRoot, `${stamp()}-${feature}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function launchBrowser() {
  const { chromium } = loadPlaywright();
  const chromePath =
    process.env.VERIFY_CHROME ||
    (existsSync('/usr/local/bin/google-chrome') ? '/usr/local/bin/google-chrome' : undefined);
  return chromium.launch({
    headless: process.env.VERIFY_HEADED === '1' ? false : true,
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
}

async function openPage(browser, origin) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
  });
  page.on('pageerror', (err) => {
    console.error('verify-sdk-demo drive: pageerror', err.message);
  });
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  return page;
}

async function waitForDemoChrome(page) {
  await page.getByRole('button', { name: 'Bible Reader' }).waitFor({ timeout: 15_000 });
}

async function waitForBibleRenderer(page) {
  const renderer = page.locator('[data-slot="yv-bible-renderer"]');
  await renderer.waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('.yv-v[v]').first().waitFor({ state: 'visible', timeout: 30_000 });
  return renderer;
}

async function assertNotMissingAppKey(page) {
  const alert = page.getByRole('alert');
  if ((await alert.count()) === 0) return;
  const text = (await alert.innerText()).replace(/\s+/g, ' ').trim();
  if (/app key is missing or invalid/i.test(text) || /couldn't be loaded because the app key/i.test(text)) {
    throw new Error(
      `Demo rendered the missing-app-key panel: "${text}". Set VITE_YVP_APP_KEY (or YVP_APP_KEY) and relaunch.`,
    );
  }
}

async function withBrowser(feature, fn) {
  const instance = readInstance();
  const origin = instance.origin;
  const out = evidenceDir(feature);
  const browser = await launchBrowser();
  try {
    const page = await openPage(browser, origin);
    const result = await fn({ page, origin, out, instance });
    writeFileSync(
      join(out, 'result.json'),
      `${JSON.stringify({ feature, origin, ok: true, ...result }, null, 2)}\n`,
    );
    console.log(`verify-sdk-demo drive: ${feature} ok`);
    console.log(`verify-sdk-demo drive: evidence ${out}`);
    return result;
  } catch (err) {
    writeFileSync(
      join(out, 'result.json'),
      `${JSON.stringify(
        { feature, origin, ok: false, error: err instanceof Error ? err.message : String(err) },
        null,
        2,
      )}\n`,
    );
    console.error(`verify-sdk-demo drive: ${feature} FAILED`);
    console.error(`verify-sdk-demo drive: evidence ${out}`);
    throw err;
  } finally {
    await browser.close();
  }
}

async function cmdDoctor() {
  await withBrowser('doctor', async ({ page, out }) => {
    await page.screenshot({ path: join(out, '01-shell.png'), fullPage: true });
    await waitForDemoChrome(page);
    await assertNotMissingAppKey(page);
    const renderer = await waitForBibleRenderer(page);
    const verseCount = await page.locator('.yv-v[v]').count();
    await page.screenshot({ path: join(out, '02-reader-ready.png'), fullPage: true });
    const html = await renderer.innerText();
    if (verseCount < 1) {
      throw new Error('Bible renderer mounted but no .yv-v[v] verse wrappers found');
    }
    console.log(`verify-sdk-demo doctor: renderer ready (${verseCount} verse wrappers)`);
    return { verseCount, preview: html.slice(0, 160) };
  });
}

async function cmdBibleReader() {
  await withBrowser('bible-reader', async ({ page, out }) => {
    await waitForDemoChrome(page);
    await page.getByRole('button', { name: 'Bible Reader' }).click();
    await assertNotMissingAppKey(page);
    await waitForBibleRenderer(page);
    await page.screenshot({ path: join(out, '01-john-1.png'), fullPage: true });

    const chapterTrigger = page.getByRole('button', { name: /change bible book and chapter/i });
    const beforeLabel = (await chapterTrigger.innerText()).replace(/\s+/g, ' ').trim();
    const next = page.getByRole('button', { name: /next chapter/i });
    await next.click();

    await page
      .getByRole('status', { name: /loading passage/i })
      .waitFor({ state: 'visible', timeout: 5_000 })
      .catch(() => undefined);
    await page
      .getByRole('status', { name: /loading passage/i })
      .waitFor({ state: 'hidden', timeout: 30_000 })
      .catch(() => undefined);

    await waitForBibleRenderer(page);
    await page.waitForFunction(
      (prev) => {
        const buttons = [...document.querySelectorAll('button[aria-label]')];
        const btn = buttons.find((el) =>
          /change bible book and chapter/i.test(el.getAttribute('aria-label') || ''),
        );
        return Boolean(btn && btn.textContent && btn.textContent.replace(/\s+/g, ' ').trim() !== prev);
      },
      beforeLabel,
      { timeout: 30_000 },
    );

    const afterLabel = (await chapterTrigger.innerText()).replace(/\s+/g, ' ').trim();
    if (afterLabel === beforeLabel) {
      throw new Error(`Next chapter did not change the picker label (still "${beforeLabel}")`);
    }
    await page.screenshot({ path: join(out, '02-after-next-chapter.png'), fullPage: true });
    return { beforeLabel, afterLabel };
  });
}

async function cmdVerseOfTheDay() {
  await withBrowser('verse-of-the-day', async ({ page, out }) => {
    await waitForDemoChrome(page);
    await page.screenshot({ path: join(out, '01-before-nav.png'), fullPage: true });
    await page.getByRole('button', { name: 'Verse of the Day' }).click();
    await assertNotMissingAppKey(page);
    const cards = page.locator('section[data-yv-sdk][data-size]');
    await cards.first().waitFor({ state: 'visible', timeout: 30_000 });
    await page.locator('[data-slot="yv-bible-renderer"]').first().waitFor({
      state: 'visible',
      timeout: 30_000,
    });
    const count = await cards.count();
    if (count < 2) {
      throw new Error(`Expected two VOTD cards (default + lg); found ${count}`);
    }
    await page.getByRole('button', { name: /^share$/i }).first().waitFor({ state: 'visible' });
    await page.screenshot({ path: join(out, '02-votd.png'), fullPage: true });
    return { cardCount: count };
  });
}

async function cmdBibleCard() {
  await withBrowser('bible-card', async ({ page, out }) => {
    await waitForDemoChrome(page);
    await page.screenshot({ path: join(out, '01-before-nav.png'), fullPage: true });
    await page.getByRole('button', { name: 'Bible Card' }).click();
    await assertNotMissingAppKey(page);
    const card = page.locator('section[data-yv-sdk]').filter({ has: page.locator('h2') });
    await card.first().waitFor({ state: 'visible', timeout: 30_000 });
    await page.getByRole('heading', { level: 2 }).first().waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /change bible version/i }).waitFor({
      state: 'visible',
      timeout: 30_000,
    });
    await page.locator('[data-slot="yv-bible-renderer"]').waitFor({
      state: 'visible',
      timeout: 30_000,
    });
    const heading = (await page.getByRole('heading', { level: 2 }).first().innerText()).trim();
    await page.screenshot({ path: join(out, '02-bible-card.png'), fullPage: true });
    return { heading };
  });
}

async function cmdTheme() {
  await withBrowser('theme', async ({ page, out }) => {
    await waitForDemoChrome(page);
    await assertNotMissingAppKey(page);
    const before = await page.evaluate(() => document.documentElement.className);
    await page.screenshot({ path: join(out, '01-before-theme.png'), fullPage: true });
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await page.getByRole('menuitem', { name: 'Dark' }).click();
    await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
    const after = await page.evaluate(() => document.documentElement.className);
    const stored = await page.evaluate(() => localStorage.getItem('yv-sdk-demo-theme'));
    if (stored !== 'dark') {
      throw new Error(`Expected localStorage yv-sdk-demo-theme=dark; got ${JSON.stringify(stored)}`);
    }
    await page.screenshot({ path: join(out, '02-dark.png'), fullPage: true });
    return { beforeClass: before, afterClass: after, stored };
  });
}

const commands = {
  doctor: cmdDoctor,
  'bible-reader': cmdBibleReader,
  'verse-of-the-day': cmdVerseOfTheDay,
  'bible-card': cmdBibleCard,
  theme: cmdTheme,
};

const feature = process.argv[2] || 'bible-reader';
const run = commands[feature];
if (!run) {
  console.error(`Unknown feature "${feature}". Try: ${Object.keys(commands).join(', ')}`);
  process.exit(2);
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
