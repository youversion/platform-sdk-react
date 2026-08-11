/**
 * Builds the shape that `getBibleTextErrorMessage` reads: an `Error` with an
 * optional numeric `status`. Shared by `verse.test.tsx` and
 * `bible-card.test.tsx` so the two files cannot drift.
 */
export function createBibleTextError(message: string, status?: number): Error {
  return Object.assign(new Error(message), status === undefined ? {} : { status });
}
