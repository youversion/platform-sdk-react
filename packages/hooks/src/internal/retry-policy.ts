import { getHttpStatus } from '@youversion/platform-core';

/**
 * Extra attempts after the first one. Two retries means at most three requests.
 */
export const DEFAULT_MAX_RETRIES = 2;

/**
 * Wall-clock cutoff for *starting* a new attempt, measured from the first one.
 *
 * Read the guarantee precisely: no attempt begins after the budget is spent. An
 * attempt already in flight is not cancelled, so the chain can finish later than
 * the budget. The worst case is `budget + one request timeout + one backoff`.
 * With the default 10s timeout that is roughly 20s; an integrator who sets a
 * 15s timeout can see roughly 30s of `loading` before the final error.
 *
 * The attempt cap and this cutoff bound two different failure shapes. A
 * transport failure at 200ms exhausts the attempt cap long before the clock. A
 * request that times out at 10s spends the clock after one retry. Whichever
 * runs out first ends the chain.
 *
 * The figure is fixed on purpose. It is not derived from the configured request
 * timeout, so an integrator who sets a timeout at or above 20 seconds gets
 * single-shot behavior — which is exactly what the SDK did before retry
 * existed, so nothing regresses. Deriving it from the timeout would also
 * suppress the retry at the default 10s, which is the case the chain exists
 * for; the two values stay uncoupled.
 */
export const DEFAULT_RETRY_BUDGET_MS = 20_000;

/**
 * Backoff bases in milliseconds, one per attempt index. Attempt 0 waits out of
 * a 500ms window, attempt 1 out of a 1500ms window.
 */
const BACKOFF_BASES_MS = [500, 1500];

function isZodError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'ZodError' &&
    Array.isArray((error as { issues?: unknown }).issues)
  );
}

/**
 * Decides whether a failed request is worth sending again.
 *
 * Status is read through `getHttpStatus`, the same duck-type check the rest of
 * the SDK uses. Only a non-2xx HTTP response carries one; a timeout, a
 * transport failure, and a Zod validation error all report `undefined`.
 *
 * | Failure | status | Retry? |
 * | --- | --- | --- |
 * | Request timeout | `undefined` | yes |
 * | Transport failure (`TypeError`) | `undefined` | yes |
 * | 429 rate limited | 429 | yes |
 * | 5xx server error | >= 500 | yes |
 * | 401 invalid app key | 401 | no |
 * | 403 forbidden | 403 | no |
 * | 404 not found | 404 | no |
 * | Zod input validation | `undefined` | no |
 *
 * A Zod error is excluded explicitly, because it carries no status and would
 * otherwise fall into the retryable `undefined` bucket. The input is invalid;
 * sending it again produces the same error.
 */
export function isRetryableRequestError(error: unknown): boolean {
  if (isZodError(error)) {
    return false;
  }

  const status = getHttpStatus(error);

  // No status: a timeout or a transport failure, both worth another attempt.
  if (status === undefined) {
    return true;
  }

  if (status === 429) {
    return true;
  }

  return status >= 500;
}

/**
 * Backoff before the attempt after `attempt`, in milliseconds.
 *
 * Full jitter (`random() * base`) rather than a fixed delay, so a fanout of
 * sibling requests that failed together does not retry in lockstep and
 * reproduce the same burst.
 */
export function backoffMs(attempt: number): number {
  const index = Math.min(Math.max(attempt, 0), BACKOFF_BASES_MS.length - 1);
  return Math.random() * BACKOFF_BASES_MS[index]!;
}
