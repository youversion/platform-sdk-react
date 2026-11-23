import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  exampleLinks,
  formatHash,
  parseFragment,
  readAppRoute,
  sameRoute,
  screenIdFor,
  withRouteHash,
} from '../src/routes.ts';

const hosted = 'https://youversion.github.io/platform-sdk-react/?code=abc&state=xyz';

describe('hash routes', () => {
  it('reads an empty fragment as Bible and keeps the OAuth query on the real URL', () => {
    assert.deepEqual(readAppRoute(hosted), { destination: 'bible' });
    assert.equal(withRouteHash(hosted, { destination: 'bible' }), `${hosted}#/bible`);
    assert.equal(
      withRouteHash(`${hosted}#/examples/navigation`, { destination: 'profile' }),
      `${hosted}#/profile`,
    );
  });

  it('round-trips each destination, example, and image id', () => {
    const routes = [
      { destination: 'bible' },
      { destination: 'profile' },
      { destination: 'content', imageId: null },
      { destination: 'content', imageId: 'img/a b?#%' },
      { destination: 'examples', exampleId: null },
      ...exampleLinks.map((link) => ({ destination: 'examples' as const, exampleId: link.id })),
    ];
    for (const route of routes) {
      assert.deepEqual(parseFragment(formatHash(route).slice(1)), route);
      assert.equal(sameRoute(route, parseFragment(formatHash(route).slice(1))), true);
    }
  });

  it('falls back without inventing a screen', () => {
    assert.deepEqual(parseFragment('nope'), { destination: 'bible' });
    assert.deepEqual(parseFragment('Bible'), { destination: 'bible' });
    assert.deepEqual(parseFragment('bible/extra'), { destination: 'bible' });
    assert.deepEqual(parseFragment('profile/settings'), { destination: 'profile' });
    assert.deepEqual(parseFragment('examples'), { destination: 'examples', exampleId: null });
    assert.deepEqual(parseFragment('examples/missing'), {
      destination: 'examples',
      exampleId: null,
    });
    assert.deepEqual(parseFragment('examples/navigation/more'), {
      destination: 'examples',
      exampleId: null,
    });
    assert.deepEqual(parseFragment('examples/%'), { destination: 'examples', exampleId: null });
    assert.deepEqual(parseFragment('content'), { destination: 'content', imageId: null });
    assert.deepEqual(parseFragment('content/image'), { destination: 'content', imageId: null });
    assert.deepEqual(parseFragment('content/image/'), { destination: 'content', imageId: null });
    assert.deepEqual(parseFragment('content/image/%20'), { destination: 'content', imageId: null });
    assert.deepEqual(parseFragment('content/image/%E0%A4%A'), {
      destination: 'content',
      imageId: null,
    });
    assert.deepEqual(parseFragment('content/image/a/b'), { destination: 'content', imageId: null });
    assert.deepEqual(parseFragment('content?image=abc'), { destination: 'content', imageId: null });
  });

  it('decodes one image segment and keeps example children as their own screens', () => {
    assert.deepEqual(parseFragment('content/image/img%2Fa%20b'), {
      destination: 'content',
      imageId: 'img/a b',
    });
    assert.equal(screenIdFor({ destination: 'content', imageId: 'img/a b' }), 'content');
    assert.equal(screenIdFor({ destination: 'examples', exampleId: 'search' }), 'search');
    assert.equal(screenIdFor({ destination: 'examples', exampleId: null }), 'examples');
  });
});
