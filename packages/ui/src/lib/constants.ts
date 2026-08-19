// `process` is not typed in this browser-targeting build. Consumers' bundlers
// statically replace `process.env.NODE_ENV` at build time, so this whole
// expression folds to a constant; the `typeof` guard treats unbundled browser
// environments (no `process` global) as production so dev-only behavior stays
// off there.
declare const process: { env: { NODE_ENV?: string } };

/** True in production builds. Dev-only warnings gate on `!IS_PRODUCTION`. */
export const IS_PRODUCTION =
  !('process' in globalThis) || process.env.NODE_ENV === 'production';
