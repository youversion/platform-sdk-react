import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type {
  UsePassageProps,
  UsePassageResult,
  UseVersionsOptions,
  UseVersionsResult,
} from '@youversion/platform-react-ui';

const require = createRequire(import.meta.url);
assert.throws(() => require.resolve('@youversion/platform-react-hooks'), {
  code: 'MODULE_NOT_FOUND',
});

// Verify both packed entry points can load in Node before creating a DOM.
const {
  YouVersionProvider,
  usePassage,
  useVersions,
}: typeof import('@youversion/platform-react-ui') =
  process.argv[2] === 'cjs'
    ? require('@youversion/platform-react-ui')
    : await import('@youversion/platform-react-ui');
const { window } = new JSDOM('<div id="app"></div>', { url: 'https://consumer.example/' });
Object.assign(globalThis, { window, document: window.document, IS_REACT_ACT_ENVIRONMENT: true });

globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(url.host, 'consumer-api.example');
  assert.equal(new Headers(init?.headers).get('x-yvp-app-key'), 'consumer-key');
  if (url.pathname.endsWith('/passages/JHN.3.16')) {
    return Response.json({ id: 'JHN.3.16', reference: 'John 3:16', content: 'Fixture passage' });
  }
  if (url.pathname.endsWith('/bibles')) {
    return Response.json({
      data: [
        {
          id: 3034,
          abbreviation: 'BSB',
          localized_abbreviation: 'BSB',
          title: 'Berean Standard Bible',
          localized_title: 'Berean Standard Bible',
          language_tag: 'en',
          books: ['JHN'],
          youversion_deep_link: 'https://www.bible.com/versions/3034',
        },
      ],
    });
  }
  assert.fail(`Unexpected request: ${url}`);
};

function Probe() {
  const props: UsePassageProps = { versionId: 3034, usfm: 'JHN.3.16', format: 'text' };
  const options: UseVersionsOptions = { page_size: 10 };
  const { passage, error: passageError }: UsePassageResult = usePassage(props);
  const { versions, error: versionsError }: UseVersionsResult = useVersions(
    'en',
    undefined,
    options,
  );
  assert.ifError(passageError);
  assert.ifError(versionsError);
  return createElement(
    'output',
    null,
    `${passage?.content ?? ''}|${versions?.data[0]?.title ?? ''}`,
  );
}

const app = document.getElementById('app')!;
const root = createRoot(app);
try {
  await act(async () => {
    root.render(
      createElement(YouVersionProvider, {
        appKey: 'consumer-key',
        apiHost: 'consumer-api.example',
        children: createElement(Probe),
      }),
    );
  });
  const expected = 'Fixture passage|Berean Standard Bible';
  const deadline = Date.now() + 5000;
  while (app.textContent !== expected && Date.now() < deadline) {
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
  }
  assert.equal(app.textContent, expected);
  console.log(`Packed UI ${process.argv[2]}: both hooks read data under the UI provider`);
} finally {
  await act(async () => root.unmount());
  window.close();
}
