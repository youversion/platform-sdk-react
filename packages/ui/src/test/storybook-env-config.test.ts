import { expect, it } from 'vitest';
import { firstAppKey } from '../../.storybook/env';

it('falls through blank local app keys to the root key, preserving populated overrides', () => {
  expect(firstAppKey(undefined, undefined, '', undefined, 'root-key')).toBe('root-key');
  expect(firstAppKey(undefined, undefined, '  ', 'root-prefixed', 'root-key')).toBe(
    'root-prefixed',
  );
  expect(firstAppKey('shell-key', undefined, '', undefined, 'root-key')).toBe('shell-key');
  expect(firstAppKey('', undefined, '  ', undefined, '')).toBeUndefined();
});
