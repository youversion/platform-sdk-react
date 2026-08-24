// `process` is not typed in this browser-targeting build. Bundlers statically
// replace the `process.env.NODE_ENV` reference at build time — there is often no
// runtime `globalThis.process`, so `'process' in globalThis` is the wrong probe.
// Read the binding itself; if it throws (no process), treat as production.
declare const process: { env: { NODE_ENV?: string } };

/** True in production builds. Dev-only warnings gate on `!IS_PRODUCTION`. */
export const IS_PRODUCTION = (() => {
  try {
    return process.env.NODE_ENV === 'production';
  } catch {
    return true;
  }
})();
