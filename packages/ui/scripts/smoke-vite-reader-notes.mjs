import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import bibles from '../src/test/mock-data/bibles.json' with { type: 'json' };
import languages from '../src/test/mock-data/languages.json' with { type: 'json' };
import passages from '../src/test/mock-data/passages.json' with { type: 'json' };
import { mockBooks } from '../src/test/mock-data/books.ts';

const app = process.argv[2] ?? 'http://127.0.0.1:5176';
const api = 'https://notes-smoke.example.test';
const browser = await chromium.launch();
const context = await browser.newContext({
  locale: 'en-US',
  viewport: { width: 1280, height: 900 },
});
context.setDefaultTimeout(8_000);

const requestHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
};
const alice = { id: 'alice', name: 'Alice', granted: 'profile read_notes' };
const bob = { id: 'bob', name: 'Bob', granted: 'profile' };
const writer = { ...bob, granted: 'profile read_notes write_notes', intermediate: true };
const responses = new Map();
const exchanges = new Map();
const intermediateReturns = new Map();
const notes = [];
const page = await context.newPage();

await context.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ body: '' }));
await context.route(`${api}/**`, async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const json = (body, status = 200) =>
    route.fulfill({ json: body, headers: requestHeaders, status });
  const navigate = (destination) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<script>location.replace(${JSON.stringify(destination.href)})</script>`,
    });
  if (request.method() === 'OPTIONS')
    return route.fulfill({ headers: requestHeaders, status: 204 });

  switch (url.pathname) {
    case '/auth/authorize': {
      const source = request.frame().page();
      const response = responses.get(source);
      assert.ok(response, 'Expected a hosted auth response');
      responses.delete(source);
      await response.pause;

      const destination = new URL(url.searchParams.get('redirect_uri'));
      assert.equal(destination.origin, new URL(app).origin, 'Expected the local app callback');
      const state = url.searchParams.get('state');
      destination.searchParams.set('state', state);
      if (response.account) {
        const code = randomUUID();
        exchanges.set(code, response.account);
        destination.searchParams.set('code', code);
        if (response.account.intermediate) {
          intermediateReturns.set(state, new URL(destination));
          destination.searchParams.delete('code');
        }
      } else {
        destination.searchParams.set('error', 'access_denied');
      }
      return navigate(destination);
    }
    case '/auth/callback': {
      const state = url.searchParams.get('state');
      const destination = intermediateReturns.get(state);
      assert.ok(destination, 'Expected the state-only OAuth hop');
      // Strict Mode can initiate this navigation again before the browser leaves.
      return navigate(destination);
    }
    case '/auth/token': {
      const code = new URLSearchParams(request.postData()).get('code');
      const account = exchanges.get(code);
      assert.ok(account, 'Expected a token for the issued authorization code');
      exchanges.delete(code);
      if (account.tokenStatus) return json({}, account.tokenStatus);
      const claims = Buffer.from(JSON.stringify({ sub: account.id, name: account.name })).toString(
        'base64url',
      );
      return json({
        access_token: `token-${account.id}`,
        refresh_token: `refresh-${account.id}`,
        expires_in: 3600,
        id_token: `e30.${claims}.fixture`,
        token_type: 'Bearer',
        scope: account.granted,
      });
    }
    case '/v1/bibles/3034':
      return json({ ...bibles.individual['111'], id: 3034 });
    case '/v1/bibles':
      return json({ data: [{ ...bibles.individual['111'], id: 3034 }], next_page_token: null });
    case '/v1/languages':
      return json(languages);
    case '/v1/bibles/3034/books':
      return json(mockBooks);
    case '/v1/bibles/3034/passages/JHN.1':
      return json({ ...passages['JHN.1'], bible_id: 3034 });
    case '/v1/highlights':
      return json({ data: [] });
    case '/v1/notes': {
      const body = request.postDataJSON();
      notes.push({ body, authorization: request.headers()['authorization'] });
      return json({ ...body, id: 'smoke-note' }, 201);
    }
    default:
      return route.fulfill({ body: '', headers: requestHeaders });
  }
});

function prepareSignIn(source, account, pause) {
  responses.set(source, { account, pause });
  return source
    .waitForRequest((request) => request.url().startsWith(`${api}/auth/authorize?`))
    .then((request) => new URL(request.url()).searchParams);
}

function checkScopes(params, expected) {
  assert.deepEqual(params.get('scope').split(' ').sort(), [...expected].sort());
}

const hostedButton = (source) => source.locator('header').getByRole('button', { name: /sign in/i });
const signedInAs = (source, name) => source.locator('header').getByText(name, { exact: true });
const menu = (source) => source.getByRole('dialog', { name: 'Verse actions' });
const editor = (source) => source.getByRole('textbox', { name: 'Add Note…' });
const composer = (source, reference) =>
  source.getByRole('dialog', { name: reference, exact: true });

async function selectVerses(source, verses) {
  for (const verse of verses) await source.locator(`.yv-v[v="${verse}"]`).first().click();
}

async function selectedVerses(source) {
  const numbers = await source
    .locator('.yv-v-selected[v]')
    .evaluateAll((verses) => verses.map((verse) => Number(verse.getAttribute('v'))));
  return [...new Set(numbers)].sort((a, b) => a - b);
}

async function beginNote(source) {
  await menu(source).getByRole('button', { name: 'Save', exact: true }).click();
}

const readerScopes = ['openid', 'profile', 'read_notes', 'write_notes'];
const navbarScopes = ['openid', 'profile', 'email'];

try {
  await page.goto(app, { waitUntil: 'domcontentloaded' });
  await selectVerses(page, [4, 1]);
  await beginNote(page);
  await page
    .getByText('Save Notes and highlights to your YouVersion account.', { exact: false })
    .waitFor();
  await page.getByRole('button', { name: 'No Thanks' }).click();
  await menu(page).waitFor();
  assert.equal(await editor(page).count(), 0);

  // A real OAuth decline preserves the selection through the return to the app.
  await beginNote(page);
  const declined = prepareSignIn(page, null);
  await page.getByRole('button', { name: 'Yes Please' }).click();
  checkScopes(await declined, readerScopes);
  await page.waitForURL(/error=access_denied/);
  await menu(page).waitFor();
  assert.deepEqual(await selectedVerses(page), [1, 4]);
  assert.equal(await editor(page).count(), 0);

  const navbar = prepareSignIn(page, alice);
  await hostedButton(page).click();
  checkScopes(await navbar, navbarScopes);
  await signedInAs(page, 'Alice').waitFor();
  assert.equal(await editor(page).count(), 0);

  // A successful OAuth return that only grants read_notes cannot open a writer.
  await selectVerses(page, [4, 1]);
  await beginNote(page);
  const readOnly = prepareSignIn(page, alice);
  await page.getByRole('button', { name: 'Yes Please' }).click();
  checkScopes(await readOnly, readerScopes);
  await menu(page).waitFor();
  assert.equal(await editor(page).count(), 0);
  assert.equal(notes.length, 0);

  // A temporary token service failure leaves the prior account and selection intact.
  await beginNote(page);
  const unavailable = prepareSignIn(page, { ...alice, tokenStatus: 503 });
  await page.getByRole('button', { name: 'Yes Please' }).click();
  checkScopes(await unavailable, readerScopes);
  await signedInAs(page, 'Alice').waitFor();
  await menu(page).waitFor();
  assert.deepEqual(await selectedVerses(page), [1, 4]);
  assert.equal(notes.length, 0);

  // Alice's old authorization comes back after Bob replaces her session in another tab.
  const other = await context.newPage();
  await other.goto(app, { waitUntil: 'domcontentloaded' });
  await signedInAs(other, 'Alice').waitFor();
  await beginNote(page);
  const releaseOld = Promise.withResolvers();
  const stale = prepareSignIn(page, { ...alice, granted: writer.granted }, releaseOld.promise);
  const continueOld = page.getByRole('button', { name: 'Yes Please' }).click({ noWaitAfter: true });
  checkScopes(await stale, readerScopes);
  await other.locator('header').getByRole('button', { name: 'Sign out' }).click();
  const replacement = prepareSignIn(other, bob);
  await hostedButton(other).click();
  checkScopes(await replacement, navbarScopes);
  await signedInAs(other, 'Bob').waitFor();
  releaseOld.resolve();
  await continueOld;
  await page.waitForURL(/code=/);
  await signedInAs(page, 'Bob').waitFor();
  assert.equal(await editor(page).count(), 0);
  assert.equal(notes.length, 0);

  // Bob's successful grant resumes his exact new selection and waits for Save.
  await selectVerses(page, [4, 2]);
  await beginNote(page);
  const accepted = prepareSignIn(page, writer);
  await page.getByRole('button', { name: 'Yes Please' }).click();
  checkScopes(await accepted, readerScopes);
  await composer(page, 'John 1:2,4').waitFor();
  assert.equal(notes.length, 0);
  await editor(page).fill('Notes smoke');
  await page.setViewportSize({ width: 390, height: 844 });
  const bounds = await composer(page, 'John 1:2,4').boundingBox();
  assert.ok(
    bounds && bounds.x >= 12 && bounds.x + bounds.width <= 378,
    `Expected the composer to fit with viewport margins at 390 px, got ${JSON.stringify(bounds)}`,
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await composer(page, 'John 1:2,4').getByRole('button', { name: 'Save', exact: true }).click();
  await composer(page, 'John 1:2,4').waitFor({ state: 'hidden' });
  assert.equal(notes.length, 1);
  assert.equal(notes[0].authorization, 'Bearer token-bob');
  assert.deepEqual(notes[0].body, {
    request_id: notes[0].body.request_id,
    content: 'Notes smoke',
    status: 'private',
    passage: { bible_id: 3034, passage_id: 'JHN.1.2+JHN.1.4' },
  });

  await selectVerses(page, [2]);
  await beginNote(page);
  await editor(page).fill('Unsaved Bob draft');
  await other.locator('header').getByRole('button', { name: 'Sign out' }).click();
  await editor(page).waitFor({ state: 'hidden' });
  await hostedButton(page).waitFor();
  assert.equal(notes.length, 1);

  console.log(
    'Reader Notes smoke passed (decline, token-service recovery, two-step grant, exact create, stale callback, sign-out, navbar scopes, and narrow layout).',
  );
} finally {
  await browser.close();
}
