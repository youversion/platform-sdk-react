#!/usr/bin/env bash
# Behavioral regression tests for the workflow's trust and classification boundaries.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKFLOW="$ROOT/.github/workflows/major-release-signoff.yml"
TMP=$(mktemp -d)
passes=0
failures=0
trap 'rm -rf "$TMP"' EXIT

pass() {
  printf 'ok   %s\n' "$1"
  passes=$((passes + 1))
}

fail() {
  printf 'FAIL %s\n       %s\n' "$1" "$2"
  failures=$((failures + 1))
}

extract_step() {
  local name="$1"
  awk -v target="      - name: $name" '
    $0 == target { found = 1; next }
    found && $0 == "        run: |" { capture = 1; next }
    capture && ($0 ~ /^      - name:/ || $0 ~ /^  [[:alnum:]_-]+:/) { exit }
    capture { sub(/^          /, ""); print }
  ' "$WORKFLOW"
}

extract_step "Resolve PR context" > "$TMP/context.sh"
extract_step "Restore trusted release tooling from main" > "$TMP/restore-tooling.sh"
extract_step "Compute release preview" > "$TMP/preview.sh"
extract_step "Decide whether a signoff is required" > "$TMP/decision.sh"
extract_step "Regenerate and verify release contents" > "$TMP/verify.sh"

mkdir "$TMP/bin"
cat > "$TMP/bin/gh" <<'EOF'
#!/usr/bin/env bash
set -u
if [[ "$2" == *"/pulls/"* ]]; then
  if [ "${MOCK_PULL_ERROR:-0}" = "1" ]; then exit 1; fi
  cat "$MOCK_PR_FILE"
elif [[ "$2" == *"/compare/"* ]]; then
  echo called >> "$MOCK_COMPARE_CALLS"
  if [ "${MOCK_COMPARE_ERROR:-0}" = "1" ]; then exit 1; fi
  cat "$MOCK_COMPARE_FILE"
else
  exit 2
fi
EOF
chmod +x "$TMP/bin/gh"
cat > "$TMP/bin/pnpm" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
[ "$1" = "version-packages" ]
rm .changeset/consumed-change.md
for file in \
  packages/core/CHANGELOG.md packages/core/package.json \
  packages/hooks/CHANGELOG.md packages/hooks/package.json \
  packages/ui/CHANGELOG.md packages/ui/package.json; do
  printf 'generated\n' > "$file"
done
if [ -f CHANGELOG.md ]; then
  printf 'generated root\n' > CHANGELOG.md
fi
EOF
chmod +x "$TMP/bin/pnpm"

TOOLING_SOURCE="$TMP/tooling-source"
TOOLING_WORK="$TMP/tooling-work"
git init --quiet "$TOOLING_SOURCE"
git -C "$TOOLING_SOURCE" config commit.gpgsign false
git -C "$TOOLING_SOURCE" config user.name test
git -C "$TOOLING_SOURCE" config user.email test@example.com
mkdir -p "$TOOLING_SOURCE/scripts" "$TOOLING_SOURCE/.changeset" \
  "$TOOLING_SOURCE/packages/ui" "$TOOLING_SOURCE/examples/demo" "$TOOLING_SOURCE/tools/config"
for file in scripts/preview-release.mjs package.json pnpm-lock.yaml \
  pnpm-workspace.yaml .changeset/config.json .npmrc packages/ui/package.json \
  examples/demo/package.json tools/config/package.json; do
  printf 'main %s\n' "$file" > "$TOOLING_SOURCE/$file"
done
git -C "$TOOLING_SOURCE" add -A
git -C "$TOOLING_SOURCE" commit --quiet -m main
git -C "$TOOLING_SOURCE" branch -M main
git -C "$TOOLING_SOURCE" switch --quiet -c journey
mkdir -p "$TOOLING_SOURCE/packages/pr-only"
printf 'journey-only importer\n' > "$TOOLING_SOURCE/packages/pr-only/package.json"
for file in scripts/preview-release.mjs package.json pnpm-lock.yaml \
  pnpm-workspace.yaml .changeset/config.json packages/ui/package.json; do
  printf 'journey %s\n' "$file" > "$TOOLING_SOURCE/$file"
done
rm "$TOOLING_SOURCE/.npmrc"
printf 'journey pnpm hook\n' > "$TOOLING_SOURCE/.pnpmfile.cjs"
git -C "$TOOLING_SOURCE" add -A
git -C "$TOOLING_SOURCE" commit --quiet -m journey
TOOLING_BASE=$(git -C "$TOOLING_SOURCE" rev-parse HEAD)
for file in scripts/preview-release.mjs package.json pnpm-lock.yaml \
  pnpm-workspace.yaml .changeset/config.json packages/ui/package.json; do
  printf 'head %s\n' "$file" > "$TOOLING_SOURCE/$file"
done
git -C "$TOOLING_SOURCE" add -A
git -C "$TOOLING_SOURCE" commit --quiet -m head
TOOLING_HEAD=$(git -C "$TOOLING_SOURCE" rev-parse HEAD)
git clone --quiet "$TOOLING_SOURCE" "$TOOLING_WORK"
git -C "$TOOLING_WORK" checkout --quiet "$TOOLING_HEAD"

if (cd "$TOOLING_WORK" && BASE_SHA="$TOOLING_BASE" bash "$TMP/restore-tooling.sh") \
  >/dev/null 2>&1 &&
  [ "$(git -C "$TOOLING_WORK" rev-parse HEAD)" = "$TOOLING_HEAD" ] &&
  [ "$(cat "$TOOLING_WORK/package.json")" = 'main package.json' ] &&
  [ "$(cat "$TOOLING_WORK/pnpm-lock.yaml")" = 'main pnpm-lock.yaml' ] &&
  [ "$(cat "$TOOLING_WORK/packages/ui/package.json")" = 'main packages/ui/package.json' ] &&
  [ "$(cat "$TOOLING_WORK/.npmrc")" = 'main .npmrc' ] &&
  [ ! -e "$TOOLING_WORK/packages/pr-only/package.json" ] &&
  [ ! -e "$TOOLING_WORK/.pnpmfile.cjs" ]; then
  pass "restores the complete release toolchain from trusted main"
else
  fail "restores the complete release toolchain from trusted main" \
    "expected main-owned files, removed PR inputs, and an unchanged head commit"
fi

HEAD_SHA=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
BASE_SHA=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
VALID_PR=$(jq -n \
  --arg head "$HEAD_SHA" --arg base "$BASE_SHA" \
  '{
    head: {sha: $head, ref: "changeset-release/main", repo: {full_name: "youversion/platform-sdk-react"}},
    base: {sha: $base, ref: "main", repo: {full_name: "youversion/platform-sdk-react"}},
    user: {login: "github-actions[bot]", id: 41898282, type: "Bot"}
  }')
VALID_COMPARE=$(jq -n --arg base "$BASE_SHA" '{
  base_commit: {sha: $base},
  files: [
    {filename: ".changeset/consumed-change.md", status: "removed"},
    {filename: "packages/core/CHANGELOG.md", status: "modified"},
    {filename: "packages/core/package.json", status: "modified"},
    {filename: "packages/hooks/CHANGELOG.md", status: "modified"},
    {filename: "packages/hooks/package.json", status: "modified"},
    {filename: "packages/ui/CHANGELOG.md", status: "modified"},
    {filename: "packages/ui/package.json", status: "modified"},
    {filename: "CHANGELOG.md", status: "modified"}
  ]
}')

run_context_case() {
  local name="$1" expected_release_pr="$2" expected_candidate="$3" pr_json="$4" compare_json="$5"
  local event_kind="${6:-pull_request}"
  local output="$TMP/output" pr_file="$TMP/pr.json" compare_file="$TMP/compare.json"
  local event_pr_number=400 event_issue_number=
  if [ "$event_kind" = "issue_comment" ]; then
    event_pr_number=
    event_issue_number=400
  fi
  : > "$output"
  : > "$TMP/compare-calls"
  printf '%s\n' "$pr_json" > "$pr_file"
  printf '%s\n' "$compare_json" > "$compare_file"
  if PATH="$TMP/bin:$PATH" \
    EVENT_PR_NUMBER="$event_pr_number" EVENT_ISSUE_NUMBER="$event_issue_number" \
    REPOSITORY=youversion/platform-sdk-react \
    GITHUB_OUTPUT="$output" MOCK_PR_FILE="$pr_file" MOCK_COMPARE_FILE="$compare_file" \
    MOCK_COMPARE_CALLS="$TMP/compare-calls" bash "$TMP/context.sh" >/dev/null 2>&1 &&
    grep -Fxq "generated_release_pr=$expected_release_pr" "$output" &&
    grep -Fxq "generated_candidate=$expected_candidate" "$output"; then
    pass "$name"
  else
    fail "$name" "expected generated_release_pr=$expected_release_pr and generated_candidate=$expected_candidate; output: $(tr '\n' ' ' < "$output")"
  fi
}

run_context_error_case() {
  local name="$1" expected_result="$2" expected_release_pr="$3" expected_candidate="$4" error_var="$5"
  local output="$TMP/output"
  : > "$output"
  : > "$TMP/compare-calls"
  printf '%s\n' "$VALID_PR" > "$TMP/pr.json"
  printf '%s\n' "$VALID_COMPARE" > "$TMP/compare.json"
  if env PATH="$TMP/bin:$PATH" \
    EVENT_PR_NUMBER= EVENT_ISSUE_NUMBER=400 REPOSITORY=youversion/platform-sdk-react \
    GITHUB_OUTPUT="$output" MOCK_PR_FILE="$TMP/pr.json" MOCK_COMPARE_FILE="$TMP/compare.json" \
    MOCK_COMPARE_CALLS="$TMP/compare-calls" "$error_var"=1 \
    bash "$TMP/context.sh" >/dev/null 2>&1; then
    result=success
  else
    result=failure
  fi
  if [ "$result" = "$expected_result" ] &&
    { [ "$expected_result" = "failure" ] || { \
      grep -Fxq "generated_release_pr=$expected_release_pr" "$output" &&
      grep -Fxq "generated_candidate=$expected_candidate" "$output"; }; }; then
    pass "$name"
  else
    fail "$name" "expected $expected_result with generated_release_pr=$expected_release_pr and generated_candidate=$expected_candidate; got $result and $(tr '\n' ' ' < "$output")"
  fi
}

run_context_case "accepts the exact generated release PR and consumed changeset shape" \
  true true "$VALID_PR" "$VALID_COMPARE"
run_context_case "human issue comments resolve the current PR identity and head" \
  true true "$VALID_PR" "$VALID_COMPARE" issue_comment

for field in login id type; do
  case "$field" in
    login) altered=$(jq '.user.login = "github-actions"' <<<"$VALID_PR") ;;
    id) altered=$(jq '.user.id = 1' <<<"$VALID_PR") ;;
    type) altered=$(jq '.user.type = "User"' <<<"$VALID_PR") ;;
  esac
  run_context_case "rejects the wrong bot author $field" false false "$altered" "$VALID_COMPARE"
done

run_context_case "rejects the wrong generated-release branch" false false \
  "$(jq '.head.ref = "changeset-release/next"' <<<"$VALID_PR")" "$VALID_COMPARE"
run_context_case "rejects the wrong base branch" false false \
  "$(jq '.base.ref = "develop"' <<<"$VALID_PR")" "$VALID_COMPARE"
run_context_case "rejects a different head repository" false false \
  "$(jq '.head.repo.full_name = "attacker/fork"' <<<"$VALID_PR")" "$VALID_COMPARE"
run_context_case "rejects a different base repository" false false \
  "$(jq '.base.repo.full_name = "attacker/fork"' <<<"$VALID_PR")" "$VALID_COMPARE"

run_context_case "blocks an added changeset input as a generated release PR" true false "$VALID_PR" \
  "$(jq '.files[0].status = "added"' <<<"$VALID_COMPARE")"
run_context_case "blocks a modified changeset input as a generated release PR" true false "$VALID_PR" \
  "$(jq '.files[0].status = "modified"' <<<"$VALID_COMPARE")"
run_context_case "allows extra files only into complete-tree verification" true true "$VALID_PR" \
  "$(jq '.files += [{filename:"packages/core/src/client.ts",status:"modified"}]' <<<"$VALID_COMPARE")"
run_context_case "blocks a comparison for a different base SHA as a generated release PR" true false "$VALID_PR" \
  "$(jq '.base_commit.sha = "cccccccccccccccccccccccccccccccccccccccc"' <<<"$VALID_COMPARE")"
run_context_case "blocks a generated release PR without an immutable base SHA" true false \
  "$(jq '.base.sha = null' <<<"$VALID_PR")" "$VALID_COMPARE"
run_context_case "blocks a comparison without a verifiable file list as a generated release PR" true false "$VALID_PR" \
  "$(jq 'del(.files)' <<<"$VALID_COMPARE")"
run_context_case "blocks a potentially truncated 300-file generated release comparison" true false "$VALID_PR" \
  "$(jq '.files += [range(7;300) | {filename:("file-" + tostring),status:"modified"}]' <<<"$VALID_COMPARE")"
run_context_error_case "comparison API errors retain generated identity and fail the precheck" \
  success true false MOCK_COMPARE_ERROR
run_context_error_case "PR API errors fail the resolver closed" failure false false MOCK_PULL_ERROR

VERIFY_REPO="$TMP/verify-repo"
git init --quiet "$VERIFY_REPO"
git -C "$VERIFY_REPO" config commit.gpgsign false
git -C "$VERIFY_REPO" config user.name test
git -C "$VERIFY_REPO" config user.email test@example.com
mkdir -p "$VERIFY_REPO/.changeset" \
  "$VERIFY_REPO/packages/core" "$VERIFY_REPO/packages/hooks" "$VERIFY_REPO/packages/ui"
printf '%s\n' '---' '---' > "$VERIFY_REPO/.changeset/consumed-change.md"
printf 'base root\n' > "$VERIFY_REPO/CHANGELOG.md"
for file in \
  packages/core/CHANGELOG.md packages/core/package.json \
  packages/hooks/CHANGELOG.md packages/hooks/package.json \
  packages/ui/CHANGELOG.md packages/ui/package.json; do
  printf 'base\n' > "$VERIFY_REPO/$file"
done
git -C "$VERIFY_REPO" add -A
git -C "$VERIFY_REPO" commit --quiet -m base
VERIFY_BASE=$(git -C "$VERIFY_REPO" rev-parse HEAD)
(cd "$VERIFY_REPO" && PATH="$TMP/bin:$PATH" pnpm version-packages)
git -C "$VERIFY_REPO" add -A
git -C "$VERIFY_REPO" commit --quiet -m generated
VERIFY_CANONICAL=$(git -C "$VERIFY_REPO" rev-parse HEAD)
printf 'tampered\n' > "$VERIFY_REPO/packages/core/package.json"
git -C "$VERIFY_REPO" add -A
git -C "$VERIFY_REPO" commit --quiet -m tampered
VERIFY_TAMPERED=$(git -C "$VERIFY_REPO" rev-parse HEAD)
git -C "$VERIFY_REPO" reset --hard --quiet "$VERIFY_CANONICAL"
mkdir -p "$VERIFY_REPO/packages/core/src"
printf 'unrelated source\n' > "$VERIFY_REPO/packages/core/src/client.ts"
git -C "$VERIFY_REPO" add -A
git -C "$VERIFY_REPO" commit --quiet -m extra-source
VERIFY_EXTRA_SOURCE=$(git -C "$VERIFY_REPO" rev-parse HEAD)
git -C "$VERIFY_REPO" remote add origin "$VERIFY_REPO"

run_content_verification_case() {
  local name="$1" expected="$2" head="$3" output="$TMP/verify-output"
  git -C "$VERIFY_REPO" reset --hard --quiet "$VERIFY_BASE"
  : > "$output"
  if (cd "$VERIFY_REPO" && \
    PATH="$TMP/bin:$PATH" HEAD_SHA="$head" GITHUB_OUTPUT="$output" bash "$TMP/verify.sh") \
    >/dev/null 2>&1 && grep -Fxq "verified=$expected" "$output"; then
    pass "$name"
  else
    fail "$name" "expected verified=$expected; output: $(tr '\n' ' ' < "$output")"
  fi
}

run_content_verification_case "accepts base-owned output with a generated root changelog" \
  true "$VERIFY_CANONICAL"
run_content_verification_case "rejects tampered content at an allowed manifest path" \
  false "$VERIFY_TAMPERED"
run_content_verification_case "rejects an unrelated source file after the prefilter" \
  false "$VERIFY_EXTRA_SOURCE"

run_decision_case() {
  local name="$1" expected="$2" generated_release_pr="$3" candidate="$4"
  local verification_result="$5" verified="$6" preview_result="$7" preview_major="$8"
  local output="$TMP/decision-output"
  : > "$output"
  if GENERATED_RELEASE_PR="$generated_release_pr" GENERATED_CANDIDATE="$candidate" \
    GENERATED_RELEASE_RESULT="$verification_result" \
    VERIFIED_GENERATED_RELEASE="$verified" IS_FORK=false PREVIEW_RESULT="$preview_result" \
    PREVIEW_IS_MAJOR="$preview_major" PREVIEW_NEXT=3.0.0 PREVIEW_RELEASE_TYPE=major \
    GITHUB_OUTPUT="$output" bash "$TMP/decision.sh" >/dev/null 2>&1 &&
    grep -Fxq "$expected" "$output"; then
    pass "$name"
  else
    fail "$name" "expected '$expected'; output: $(tr '\n' ' ' < "$output")"
  fi
}

run_decision_case "generated releases require no source-PR major signoff" \
  'is_major=0' true true success true skipped ''
run_decision_case "unverifiable generated release comparisons cannot fall back to preview" \
  'blocked=generated release comparison could not be verified' true false skipped '' success 0
run_decision_case "noncanonical generated release contents fail closed" \
  'blocked=generated release contents did not match base-owned Changesets output' \
  true true success false skipped ''
run_decision_case "failed generated release verification fails closed" \
  'blocked=generated release contents did not match base-owned Changesets output' \
  true true failure '' skipped ''
run_decision_case "ordinary major previews still require signoff" \
  'is_major=1' false false skipped '' success 1
run_decision_case "failed ordinary previews remain blocked, not major" \
  'blocked=release preview did not succeed (failure)' false false skipped '' failure ''

if pnpm exec prettier --check "$WORKFLOW" >/dev/null; then
  pass "workflow YAML parses and is formatted"
else
  fail "workflow YAML parses and is formatted" "prettier rejected $WORKFLOW"
fi

if grep -Fq \
  "github.event.comment.user.type == 'Bot' && format('bot-{0}', github.run_id) || 'evaluation'" \
  "$WORKFLOW"; then
  pass "bot comments retain an isolated pre-job concurrency key"
else
  fail "bot comments retain an isolated pre-job concurrency key" "isolated concurrency expression is missing"
fi

if grep -Fq 'types: [opened, synchronize, reopened, edited]' "$WORKFLOW"; then
  pass "base retargets trigger a fresh signoff evaluation"
else
  fail "base retargets trigger a fresh signoff evaluation" \
    "pull_request edited events are not enabled"
fi

if grep -Fq \
  "needs.context.outputs.generated_release_pr != 'true'" \
  "$WORKFLOW"; then
  pass "generated release identity always stays out of the ordinary preview"
else
  fail "generated release identity always stays out of the ordinary preview" "preview does not use generated release identity"
fi

if grep -Fq \
  'BASE=$(git merge-base "$BASE_SHA" "$HEAD_SHA")' "$TMP/preview.sh" && \
  grep -Fq 'node scripts/preview-release.mjs --base "$BASE" --head "$HEAD_SHA"' \
    "$TMP/preview.sh"; then
  pass "ordinary previews compare from the immutable PR endpoints' merge base"
else
  fail "ordinary previews compare from the immutable PR endpoints' merge base" \
    "preview does not use the immutable PR endpoints' merge base"
fi

if grep -Fq 'Generated release PR; major signoff is enforced on source PRs.' "$WORKFLOW"; then
  pass "generated releases publish an explicit lifecycle-aware success"
else
  fail "generated releases publish an explicit lifecycle-aware success" "status wording is missing"
fi

printf '\n%d passed, %d failed\n' "$passes" "$failures"
[[ "$failures" -eq 0 ]]
