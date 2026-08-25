import { readFile } from 'node:fs/promises';
import * as babel from '@babel/core';
import { stylexBabelTransformOptions } from './stylex-config.mjs';

export function stylexEsbuildPlugin() {
  return {
    name: 'yv-stylex',
    setup(build) {
      build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async (args) => {
        const code = await readFile(args.path, 'utf8');
        if (!code.includes('@stylexjs/stylex')) return undefined;

        const result = await babel.transformAsync(code, {
          ...stylexBabelTransformOptions,
          filename: args.path,
        });
        if (!result?.code) return undefined;

        const loader = args.path.endsWith('x') ? 'tsx' : 'ts';
        return { contents: result.code, loader };
      });
    },
  };
}
