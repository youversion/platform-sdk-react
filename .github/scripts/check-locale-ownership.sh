#!/usr/bin/env bash
set -euo pipefail

BASE_SHA="${BASE_SHA:?BASE_SHA is required}"
HEAD_SHA="${HEAD_SHA:?HEAD_SHA is required}"
PR_AUTHOR="${PR_AUTHOR:-}"
HEAD_REF="${HEAD_REF:-}"
ACTOR="${ACTOR:-}"

LOCALIZATION_SYNC_BOT="app/platform-localization-pr-bot"
LOCALE_PATH_PREFIX="packages/ui/src/i18n/locales/"
FAILURE_MSG="Locale files are owned by platform-localization. Add strings upstream; do not edit packages/ui/src/i18n/locales/ in feature PRs. See docs/i18n-guidelines.md"

is_allowed_sync_pr() {
  [[ "$PR_AUTHOR" == "$LOCALIZATION_SYNC_BOT" ]] \
    && [[ "$HEAD_REF" =~ ^chore/localization-sync-react- ]]
}

if is_allowed_sync_pr; then
  echo "Locale ownership check skipped: allowed localization sync PR (actor=${ACTOR:-<unset>}, author=${PR_AUTHOR:-<unset>}, branch=${HEAD_REF:-<unset>})"
  exit 0
fi

changed_files="$(git diff --name-only "$BASE_SHA" "$HEAD_SHA" -- "$LOCALE_PATH_PREFIX" || true)"

if [[ -z "$changed_files" ]]; then
  echo "Locale ownership check passed: no locale file changes"
  exit 0
fi

echo "::error title=Locale files are upstream-owned::${FAILURE_MSG}"
echo ""
echo "Changed locale files:"
echo "$changed_files"
echo ""
echo "$FAILURE_MSG"
exit 1
