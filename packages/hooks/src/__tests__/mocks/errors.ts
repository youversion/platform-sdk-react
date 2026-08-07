/**
 * Builds an error `useApiData` will not retry.
 *
 * A bare `new Error(...)` carries no HTTP status, and the retry policy reads a
 * missing status as a timeout or a transport failure — both worth another
 * attempt. A hook test that asserts an error reaches the consumer wants a final
 * failure, not a transient one, so it attaches a status the policy treats as
 * terminal.
 *
 * The retry chain itself has its own coverage in `useApiData.test.tsx`, which
 * is the one place the retry code lives.
 */
export function createFinalError(message: string, status = 404): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}
