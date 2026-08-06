/**
 * Types for `scope-selectors.mjs`.
 *
 * The script itself is plain JavaScript because the build runs it with bare
 * `node`, before any TypeScript step exists. This declaration is what lets
 * `src/styles/scope-selectors.test.ts` import it under `--noEmit`.
 */
export interface ScopeCssOptions {
  /** Minify the rewritten output. The published sheet is minified; tests are not. */
  minify?: boolean;
  /** Filename reported in Lightning CSS parse errors. */
  filename?: string;
}

export interface ScopeCssResult {
  /** The rewritten stylesheet. */
  code: string;
  /**
   * Selectors that are still free to match consumer DOM, found by re-parsing
   * `code`. A non-empty list is a build failure.
   */
  ungated: string[];
}

export declare function scopeCss(source: string, options?: ScopeCssOptions): ScopeCssResult;
