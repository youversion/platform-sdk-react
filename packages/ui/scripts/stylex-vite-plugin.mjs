import * as babel from '@babel/core';
import { stylexBabelTransformOptions } from './stylex-config.mjs';

export function stylexVitePlugin() {
  return {
    name: 'yv-stylex',
    enforce: 'pre',
    async transform(code, id) {
      const filename = id.split('?')[0] ?? id;
      if (!filename.includes('/packages/ui/src/') && !filename.includes('/src/')) {
        return undefined;
      }
      if (!/\.[cm]?[jt]sx?$/.test(filename)) return undefined;
      if (!code.includes('@stylexjs/stylex')) return undefined;

      const result = await babel.transformAsync(code, {
        ...stylexBabelTransformOptions,
        filename,
        sourceMaps: true,
      });
      if (!result?.code) return undefined;
      return { code: result.code, map: result.map };
    },
  };
}
