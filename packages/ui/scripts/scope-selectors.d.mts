/**
 * Types for `scope-selectors.mjs`.
 *
 * The script itself is plain JavaScript, because the build runs it with bare
 * `node`, before any TypeScript step exists. This declaration lets
 * `src/styles/scope-selectors.test.ts` import the script under `--noEmit`.
 */
export interface ScopeCssOptions {
  /** Minify the rewritten output. The published sheet is minified. The tests are not. */
  minify?: boolean;
  /** The filename that Lightning CSS reports in parse errors. */
  filename?: string;
}

export interface ScopeCssResult {
  /** The rewritten stylesheet. */
  code: string;
  /**
   * Selectors that can still match consumer DOM, found by a second parse of
   * `code`. A non-empty list is a build failure.
   */
  ungated: string[];
  /**
   * Everything else the second parse rejected: a missing `@layer yv` wrapper, a
   * non-exempt declaration that is not important, `!important` inside a
   * `@keyframes` body, or a keyframe-animated property that is not exempt. A
   * non-empty list is a build failure.
   */
  problems: string[];
}

export declare function scopeCss(source: string, options?: ScopeCssOptions): ScopeCssResult;
