import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const [sdk, format] = process.argv.slice(2);
const require = createRequire(import.meta.url);
const other = sdk.endsWith('-ui')
  ? '@youversion/platform-react-hooks'
  : '@youversion/platform-react-ui';
assert.throws(() => require.resolve(other), { code: 'MODULE_NOT_FOUND' });
const { YouVersionProvider, usePassage, useVersions } =
  format === 'esm' ? await import(sdk) : require(sdk);

const dom = new JSDOM('<div id="root"></div>', { url: 'https://consumer.example/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const passage = { id: 'JHN.3.16', reference: 'John 3:16', content: 'Consumer passage' };
const version = {
  id: 3034,
  abbreviation: 'BSB',
  localized_abbreviation: 'BSB',
  title: 'Berean Standard Bible',
  localized_title: 'Berean Standard Bible',
  language_tag: 'en',
  books: ['JHN'],
  youversion_deep_link: 'https://www.bible.com/versions/3034',
};
const requests = [];
globalThis.fetch = async (input, init) => {
  const url = new URL(input);
  assert.equal(url.host, 'consumer-api.example');
  assert.equal(new Headers(init.headers).get('x-yvp-app-key'), 'consumer-key');
  requests.push(url.pathname);
  if (url.pathname.endsWith('/passages/JHN.3.16')) return Response.json(passage);
  if (url.pathname.endsWith('/bibles')) return Response.json({ data: [version] });
  throw new Error(`Unexpected request: ${url}`);
};

const results = [];
function Probe() {
  const { passage, loading, error } = usePassage({
    versionId: 3034,
    usfm: 'JHN.3.16',
    format: 'text',
  });
  const versions = useVersions('en');
  results.push({ passage, loading, error, versions });
  return React.createElement('output', null, passage?.content ?? 'loading');
}

const root = createRoot(document.getElementById('root'));
try {
  await act(async () => {
    root.render(
      React.createElement(
        YouVersionProvider,
        {
          appKey: 'consumer-key',
          apiHost: 'consumer-api.example',
        },
        React.createElement(
          React.Fragment,
          null,
          React.createElement(Probe),
          React.createElement(Probe),
        ),
      ),
    );
  });
  const deadline = Date.now() + 5000;
  while (!results.at(-1)?.passage || !results.at(-1)?.versions.versions) {
    assert.ok(Date.now() < deadline, JSON.stringify(results.at(-1)));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
  }
  const last = results.at(-1);
  assert.deepEqual(last.passage, passage);
  assert.deepEqual(last.versions.versions.data, [version]);
  assert.equal(last.error, null);
  assert.equal(last.versions.error, null);
  assert.equal(last.loading, false);
  assert.equal(last.versions.loading, false);
  assert.deepEqual(
    [...document.querySelectorAll('output')].map((node) => node.textContent),
    ['Consumer passage', 'Consumer passage'],
  );
  assert.equal(requests.filter((path) => path.endsWith('/passages/JHN.3.16')).length, 1);
  assert.equal(requests.filter((path) => path.endsWith('/bibles')).length, 1);
  console.log(`${sdk} ${format}: data hooks share provider configuration and query cache`);
} finally {
  await act(async () => root.unmount());
  dom.window.close();
}
