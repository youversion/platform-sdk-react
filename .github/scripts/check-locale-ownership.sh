#!/usr/bin/env bash
set -euo pipefail

BASE_SHA="${BASE_SHA:?BASE_SHA is required}"
HEAD_SHA="${HEAD_SHA:?HEAD_SHA is required}"
PR_AUTHOR="${PR_AUTHOR:-}"
HEAD_REF="${HEAD_REF:-}"
ACTOR="${ACTOR:-}"

LOCALIZATION_SYNC_BOT_USER="platform-localization-pr-bot[bot]"
LOCALE_PATH_PREFIX="packages/ui/src/i18n/locales/"
FAILURE_MSG="Locale files are owned by platform-localization. Add strings upstream; do not edit packages/ui/src/i18n/locales/ in feature PRs. See docs/i18n-guidelines.md"

# Provenance is decided by PR author alone. The head branch is named by the same
# automation whose identity the author check verifies, so gating on it adds no
# forgery resistance — only a second string two repos must keep in sync by hand.
# That coupling is exactly what broke on 2026-07-28. This is an accident
# guardrail, not a security boundary: for `pull_request` events the workflow and
# this script come from the PR's merge ref, so a PR can edit its own gate.
# See docs/adr/0003-locale-ownership-gate-keys-on-pr-author.md
is_allowed_sync_pr() {
  [[ "$PR_AUTHOR" == "$LOCALIZATION_SYNC_BOT_USER" ]]
}

if is_allowed_sync_pr; then
  echo "Locale ownership check skipped: allowed localization sync PR (actor=${ACTOR:-<unset>}, author=${PR_AUTHOR:-<unset>}, branch=${HEAD_REF:-<unset>})"
  exit 0
fi

changed_files="$(git diff --name-only "$BASE_SHA...$HEAD_SHA" -- "$LOCALE_PATH_PREFIX")"

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
echo ""
echo "PR author:   ${PR_AUTHOR:-<unset>} (an automated sync is authored by ${LOCALIZATION_SYNC_BOT_USER})"
echo "Head branch: ${HEAD_REF:-<unset>}"
exit 1
