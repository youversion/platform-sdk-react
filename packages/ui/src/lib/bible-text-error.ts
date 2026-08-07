import type { TFunction } from 'i18next';

export type BibleTextError = Error & {
  status?: number;
};

function isUnreachableServerError(message: string): boolean {
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('load failed') ||
    message.includes('request timeout')
  );
}

export function getBibleTextErrorMessage(error: BibleTextError, t: TFunction): string {
  const status = error.status;
  const message = error.message.toLowerCase();

  if (status === 401) {
    return t('invalidAppKeyError');
  }

  if (status === 403) {
    return t('forbiddenError');
  }

  if (status === 429) {
    return t('rateLimitedError');
  }

  if (status !== undefined && status >= 500) {
    return t('serverError');
  }

  if (status === 404 || message.includes('not found')) {
    return t('passageNotFoundError');
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return t('unreachableServerError');
  }

  if (isUnreachableServerError(message)) {
    return t('unreachableServerError');
  }

  return t('genericPassageError');
}

/**
 * Decides whether a failed Bible text fetch is worth retrying.
 *
 * Mirrors the guard order of `getBibleTextErrorMessage`: HTTP status first, then
 * the message, then `navigator.onLine`. A 401, 403, or 404 is final — retrying
 * cannot fix a bad app key, a forbidden app, or a passage that does not exist in
 * the selected version. A 429, a 5xx, an offline device, and the transport and
 * timeout message shapes are all transient, so the caller may offer a retry.
 *
 * Anything unrecognized returns `false`: an unknown failure gets a plain final
 * message rather than a button that probably does nothing.
 */
export function isRetryableBibleTextError(error: BibleTextError): boolean {
  const status = error.status;
  const message = error.message.toLowerCase();

  if (status === 401 || status === 403 || status === 404) {
    return false;
  }

  if (status === 429) {
    return true;
  }

  if (status !== undefined && status >= 500) {
    return true;
  }

  if (message.includes('not found')) {
    return false;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }

  return isUnreachableServerError(message);
}
