import type { TFunction } from 'i18next';

type BibleTextError = Error & {
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
