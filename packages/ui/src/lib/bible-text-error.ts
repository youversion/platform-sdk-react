type BibleTextError = Error & {
  status?: number;
};

const PASSAGE_NOT_FOUND_MESSAGE = "This passage isn't available in the selected Bible version.";
const INVALID_APP_KEY_MESSAGE =
  "This Bible content couldn't be loaded because the app key is missing or invalid.";
const FORBIDDEN_MESSAGE = "This app isn't allowed to access this Bible content.";
const UNREACHABLE_SERVER_MESSAGE =
  "The Bible server couldn't be reached. Check your connection and try again.";
const RATE_LIMITED_MESSAGE =
  'The Bible service is receiving too many requests right now. Please wait a moment and try again.';
const SERVER_ERROR_MESSAGE =
  'The Bible service is having trouble right now. Please try again in a moment.';
const GENERIC_ERROR_MESSAGE = "We couldn't load this Bible passage. Please try again.";

function isUnreachableServerError(message: string): boolean {
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('load failed') ||
    message.includes('request timeout')
  );
}

export function getBibleTextErrorMessage(error: BibleTextError): string {
  const status = error.status;
  const message = error.message.toLowerCase();

  if (status === 401) {
    return INVALID_APP_KEY_MESSAGE;
  }

  if (status === 403) {
    return FORBIDDEN_MESSAGE;
  }

  if (status === 404 || message.includes('not found')) {
    return PASSAGE_NOT_FOUND_MESSAGE;
  }

  if (status === 429) {
    return RATE_LIMITED_MESSAGE;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return UNREACHABLE_SERVER_MESSAGE;
  }

  if (isUnreachableServerError(message)) {
    return UNREACHABLE_SERVER_MESSAGE;
  }

  if (status !== undefined && status >= 500) {
    return SERVER_ERROR_MESSAGE;
  }

  return GENERIC_ERROR_MESSAGE;
}
