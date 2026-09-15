#!/usr/bin/env bash
# Structural regression tests for the workflow's concurrency and classification boundaries.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKFLOW="$ROOT/.github/workflows/major-release-signoff.yml"
passes=0
failures=0

pass() {
  printf 'ok   %s\n' "$1"
  passes=$((passes + 1))
}

fail() {
  printf 'FAIL %s\n       %s\n' "$1" "$2"
  failures=$((failures + 1))
}

assert_contains() {
  local name="$1" needle="$2"
  if grep -Fq -- "$needle" "$WORKFLOW"; then
    pass "$name"
  else
    fail "$name" "workflow did not contain: $needle"
  fi
}

assert_not_contains() {
  local name="$1" needle="$2"
  if grep -Fq -- "$needle" "$WORKFLOW"; then
    fail "$name" "workflow unexpectedly contained: $needle"
  else
    pass "$name"
  fi
}

if pnpm exec prettier --check "$WORKFLOW" >/dev/null; then
  pass "workflow YAML parses and is formatted"
else
  fail "workflow YAML parses and is formatted" "prettier rejected $WORKFLOW"
fi

assert_contains "bot comments use an isolated pre-job concurrency key" \
  "github.event.comment.user.type == 'Bot' && format('bot-{0}', github.run_id) || 'evaluation'"
assert_contains "bot issue comments do not evaluate the PR" \
  "github.event.comment.user.type != 'Bot'"
assert_contains "unevaluable previews are not classified as major" \
  'echo "is_major=0" >> "$GITHUB_OUTPUT"'
assert_not_contains "no decision branch maps uncertainty to major" \
  'echo "is_major=1" >> "$GITHUB_OUTPUT"'
assert_contains "malformed preview decisions fail closed" \
  "blocked=release preview returned an invalid major decision"
assert_contains "unknown impact has its own failure status" \
  "Post failure status when release impact cannot be determined"
assert_contains "breaking-change status requires a trusted decision" \
  "steps.decision.outputs.blocked == '' && steps.decision.outputs.is_major == '1'"
assert_contains "trusted non-major evaluations remove stale instructions" \
  "Mark PRs without a breaking change as success and remove stale instructions"

printf '\n%d passed, %d failed\n' "$passes" "$failures"
[[ "$failures" -eq 0 ]]
