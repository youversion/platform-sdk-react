#!/usr/bin/env bash
# Unit tests for check-locale-ownership.sh.
#
# Each case builds a throwaway git repo in $TMPDIR with a real two-commit
# history, so the gate's actual `git diff BASE...HEAD -- <prefix>` runs rather
# than a stub. Run locally with `pnpm test:ci-scripts`.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATE="$SCRIPT_DIR/check-locale-ownership.sh"
LOCALE_DIR="packages/ui/src/i18n/locales"
SYNC_BOT="platform-localization-pr-bot[bot]"

passes=0
failures=0
LAST_CODE=0
LAST_OUT=""

pass() {
  printf 'ok   %s\n' "$1"
  passes=$((passes + 1))
}

fail() {
  printf 'FAIL %s\n       %s\n' "$1" "$2"
  failures=$((failures + 1))
}

# make_repo <path-changed-on-head> -> "<repo> <base_sha> <head_sha>"
make_repo() {
  local changed="$1" repo
  repo="$(mktemp -d)"
  git -C "$repo" init -q -b main
  git -C "$repo" config user.email test@example.com
  git -C "$repo" config user.name test
  git -C "$repo" config commit.gpgsign false
  mkdir -p "$repo/$LOCALE_DIR" "$repo/$(dirname "$changed")"
  echo '{"greeting":"hello"}' >"$repo/$LOCALE_DIR/en.json"
  git -C "$repo" add -A
  git -C "$repo" commit -qm base
  local base
  base="$(git -C "$repo" rev-parse HEAD)"
  echo 'changed' >"$repo/$changed"
  git -C "$repo" add -A
  git -C "$repo" commit -qm head
  echo "$repo $base $(git -C "$repo" rev-parse HEAD)"
}

# run_case <path-changed-on-head> [ENV=VALUE ...] -> sets LAST_CODE, LAST_OUT
run_case() {
  local changed="$1"
  shift
  local repo base head
  read -r repo base head <<<"$(make_repo "$changed")"
  # `env -u` keeps an ambient PR_AUTHOR/HEAD_REF/ACTOR out of the fixture, so
  # "no branch reported" really means unset.
  LAST_OUT="$(cd "$repo" && env -u PR_AUTHOR -u HEAD_REF -u ACTOR \
    BASE_SHA="$base" HEAD_SHA="$head" "$@" bash "$GATE" 2>&1)"
  LAST_CODE=$?
  rm -rf "$repo"
}

assert_code() {
  local name="$1" want="$2"
  if [[ "$LAST_CODE" == "$want" ]]; then
    pass "$name"
  else
    fail "$name" "expected exit $want, got $LAST_CODE: $LAST_OUT"
  fi
}

assert_contains() {
  local name="$1" needle="$2"
  if [[ "$LAST_OUT" == *"$needle"* ]]; then
    pass "$name"
  else
    fail "$name" "output did not contain '$needle': $LAST_OUT"
  fi
}

# --- the regression this suite exists for -----------------------------------
# platform-localization emits a fixed, unsuffixed branch name as of 2026-07-28.
run_case "$LOCALE_DIR/en.json" PR_AUTHOR="$SYNC_BOT" HEAD_REF="chore/localization-sync-react"
assert_code "sync bot on the current fixed branch is allowed" 0

# --- the branch name is not part of the decision ----------------------------
run_case "$LOCALE_DIR/en.json" PR_AUTHOR="$SYNC_BOT" HEAD_REF="chore/localization-sync-react-20260721-08557a1"
assert_code "sync bot on a legacy suffixed branch is allowed" 0

run_case "$LOCALE_DIR/en.json" PR_AUTHOR="$SYNC_BOT" HEAD_REF="whatever-upstream-renames-this-to"
assert_code "sync bot on an arbitrary branch is allowed" 0

run_case "$LOCALE_DIR/en.json" PR_AUTHOR="$SYNC_BOT"
assert_code "sync bot with no branch reported is allowed" 0

# --- humans are still blocked -----------------------------------------------
run_case "$LOCALE_DIR/en.json" PR_AUTHOR="cameronapak" HEAD_REF="feat/some-feature"
assert_code "human editing locale JSON is blocked" 1
assert_contains "failure names the offending file" "$LOCALE_DIR/en.json"
assert_contains "failure names the observed author" "PR author:   cameronapak"

run_case "$LOCALE_DIR/en.json" PR_AUTHOR="cameronapak" HEAD_REF="chore/localization-sync-react"
assert_code "human on the sync branch name is still blocked" 1

# The author check is exact equality, not a substring or prefix match.
run_case "$LOCALE_DIR/en.json" PR_AUTHOR="evil-platform-localization-pr-bot[bot]"
assert_code "lookalike author is blocked" 1

# --- unrelated changes pass regardless of author ----------------------------
run_case "packages/ui/src/components/verse.tsx" PR_AUTHOR="cameronapak" HEAD_REF="feat/some-feature"
assert_code "human touching non-locale files passes" 0
assert_contains "passing message is explicit" "no locale file changes"

# --- required inputs --------------------------------------------------------
out="$(env -u BASE_SHA HEAD_SHA=deadbeef bash "$GATE" 2>&1)"
if [[ $? -ne 0 ]]; then
  pass "missing BASE_SHA aborts"
else
  fail "missing BASE_SHA aborts" "expected non-zero, got 0: $out"
fi

printf '\n%d passed, %d failed\n' "$passes" "$failures"
[[ "$failures" -eq 0 ]]
