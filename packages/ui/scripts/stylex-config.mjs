import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const stylexPluginPath = require.resolve('@stylexjs/babel-plugin');

/** Shared StyleX Babel options. runtimeInjection stays off so partners never compile us. */
export const stylexPluginOptions = {
  dev: false,
  runtimeInjection: false,
  treeshakeCompensation: true,
  styleResolution: 'property-specificity',
  unstable_moduleResolution: {
    type: 'commonJS',
    rootDir,
  },
};

export const stylexBabelTransformOptions = {
  babelrc: false,
  configFile: false,
  parserOpts: {
    plugins: ['typescript', 'jsx'],
  },
  cwd: rootDir,
  plugins: [[stylexPluginPath, stylexPluginOptions]],
};
