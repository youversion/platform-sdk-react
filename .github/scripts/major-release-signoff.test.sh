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
extract_step "Restore release tooling from the base branch" > "$TMP/restore-tooling.sh"
extract_step "Compute release preview" > "$TMP/preview.sh"
extract_step "Decide whether a signoff is required" > "$TMP/decision.sh"
extract_step "Regenerate and verify release contents" > "$TMP/verify.sh"

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
TOOLING_HEAD=$(git -C "$TOOLING_SOURCE" rev-parse HEAD)
git -C "$TOOLING_SOURCE" switch --quiet main
git clone --quiet "$TOOLING_SOURCE" "$TOOLING_WORK"
git -C "$TOOLING_WORK" checkout --quiet "$TOOLING_HEAD"

if (cd "$TOOLING_WORK" && bash "$TMP/restore-tooling.sh") >/dev/null 2>&1 &&
  [ "$(git -C "$TOOLING_WORK" rev-parse HEAD)" = "$TOOLING_HEAD" ] &&
  [ "$(cat "$TOOLING_WORK/package.json")" = 'main package.json' ] &&
  [ "$(cat "$TOOLING_WORK/pnpm-lock.yaml")" = 'main pnpm-lock.yaml' ] &&
  [ "$(cat "$TOOLING_WORK/packages/ui/package.json")" = 'main packages/ui/package.json' ] &&
  [ "$(cat "$TOOLING_WORK/.npmrc")" = 'main .npmrc' ] &&
  [ ! -e "$TOOLING_WORK/packages/pr-only/package.json" ] &&
  [ ! -e "$TOOLING_WORK/.pnpmfile.cjs" ]; then
  pass "restores the complete release dependency graph from trusted main"
else
  fail "restores the complete release dependency graph from trusted main" \
    "expected main-owned workspace manifests and install inputs with PR-only importers removed"
fi

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

extract_step "Restore release tooling from the base branch" > "$TMP/restore.sh"
PREVIEW_REPO="$TMP/restore-preview-repo"
git init --quiet --initial-branch=main "$PREVIEW_REPO"
git -C "$PREVIEW_REPO" config commit.gpgsign false
git -C "$PREVIEW_REPO" config user.name test
git -C "$PREVIEW_REPO" config user.email test@example.com
mkdir -p "$PREVIEW_REPO/packages/ui" "$PREVIEW_REPO/packages/core" \
  "$PREVIEW_REPO/scripts" "$PREVIEW_REPO/.changeset"
printf '{"name":"fixture","private":true}\n' > "$PREVIEW_REPO/package.json"
printf '{"name":"@fixture/ui","version":"1.0.0"}\n' > "$PREVIEW_REPO/packages/ui/package.json"
printf '{"name":"@fixture/core","version":"1.0.0"}\n' > "$PREVIEW_REPO/packages/core/package.json"
printf 'packages:\n  - "packages/*"\n' > "$PREVIEW_REPO/pnpm-workspace.yaml"
printf '// base-owned detector\n' > "$PREVIEW_REPO/scripts/preview-release.mjs"
printf '{}\n' > "$PREVIEW_REPO/.changeset/config.json"
pnpm --dir "$PREVIEW_REPO" install --lockfile-only --ignore-scripts --offline > "$TMP/preview-install.log" 2>&1
git -C "$PREVIEW_REPO" add -A
git -C "$PREVIEW_REPO" commit --quiet -m base
git -C "$PREVIEW_REPO" switch --quiet -c feature
git -C "$PREVIEW_REPO" remote add origin "$PREVIEW_REPO"
# A changed dependency, a new workspace, and a deleted workspace must not influence
# the base-owned install. The PR's major changeset must still reach the detector.
printf '{"name":"@fixture/ui","version":"1.0.0","dependencies":{"zod":"4.1.12"}}\n' \
  > "$PREVIEW_REPO/packages/ui/package.json"
mkdir "$PREVIEW_REPO/packages/new"
printf '{"name":"@fixture/new","version":"1.0.0"}\n' > "$PREVIEW_REPO/packages/new/package.json"
rm "$PREVIEW_REPO/packages/core/package.json"
printf '%s\n' '---' '"@fixture/ui": major' '---' 'PR release data' \
  > "$PREVIEW_REPO/.changeset/pr-change.md"
git -C "$PREVIEW_REPO" add -A
git -C "$PREVIEW_REPO" commit --quiet -m feature

if (cd "$PREVIEW_REPO" && bash "$TMP/restore.sh" && \
    pnpm install --frozen-lockfile --ignore-scripts --ignore-pnpmfile --offline && \
    git diff --exit-code main -- package.json pnpm-lock.yaml ':(glob)**/package.json' && \
    test ! -e packages/new/package.json && \
    git diff --exit-code HEAD -- .changeset/pr-change.md && \
    grep -Fq '"@fixture/ui": major' .changeset/pr-change.md) > "$TMP/restore.log" 2>&1; then
  pass "base tooling installs despite PR workspace dependency changes and preserves release data"
else
  fail "base tooling installs despite PR workspace dependency changes and preserves release data" \
    "$(cat "$TMP/restore.log")"
fi

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

if grep -Fq \
  "needs.context.outputs.generated_release_pr != 'true'" \
  "$WORKFLOW"; then
  pass "generated release identity always stays out of the ordinary preview"
else
  fail "generated release identity always stays out of the ordinary preview" "preview does not use generated release identity"
fi

PREVIEW_REMOTE="$TMP/preview-remote.git"
PREVIEW_REPO="$TMP/preview-repo"
git init --quiet --bare "$PREVIEW_REMOTE"
git init --quiet "$PREVIEW_REPO"
git -C "$PREVIEW_REPO" config commit.gpgsign false
git -C "$PREVIEW_REPO" config user.name test
git -C "$PREVIEW_REPO" config user.email test@example.com
git -C "$PREVIEW_REPO" remote add origin "$PREVIEW_REMOTE"
mkdir -p "$PREVIEW_REPO/scripts" "$PREVIEW_REPO/.changeset" \
  "$PREVIEW_REPO/packages/core" "$PREVIEW_REPO/packages/hooks" "$PREVIEW_REPO/packages/ui"
cp "$ROOT/scripts/preview-release.mjs" "$PREVIEW_REPO/scripts/preview-release.mjs"
cp "$ROOT/.changeset/config.json" "$PREVIEW_REPO/.changeset/config.json"
cat > "$PREVIEW_REPO/package.json" <<'EOF'
{"name":"preview-fixture","private":true,"packageManager":"pnpm@11.10.0"}
EOF
cat > "$PREVIEW_REPO/pnpm-workspace.yaml" <<'EOF'
packages:
  - "packages/*"
EOF
for package in core hooks ui; do
  case "$package" in
    core) name='@youversion/platform-core' ;;
    hooks) name='@youversion/platform-react-hooks' ;;
    ui) name='@youversion/platform-react-ui' ;;
  esac
  printf '{"name":"%s","version":"1.0.0"}\n' "$name" > "$PREVIEW_REPO/packages/$package/package.json"
done
git -C "$PREVIEW_REPO" add -A
git -C "$PREVIEW_REPO" commit --quiet -m main
git -C "$PREVIEW_REPO" branch -M main
git -C "$PREVIEW_REPO" push --quiet origin main

git -C "$PREVIEW_REPO" switch --quiet -c target
cat > "$PREVIEW_REPO/.changeset/target-major.md" <<'EOF'
---
"@youversion/platform-core": major
---

Major change inherited from the target branch.
EOF
git -C "$PREVIEW_REPO" add -A
git -C "$PREVIEW_REPO" commit --quiet -m 'target major'
git -C "$PREVIEW_REPO" push --quiet origin target
PREVIEW_BASE_SHA=$(git -C "$PREVIEW_REPO" rev-parse HEAD)

git -C "$PREVIEW_REPO" switch --quiet -c pr
printf 'non-major PR change\n' > "$PREVIEW_REPO/README.md"
git -C "$PREVIEW_REPO" add README.md
git -C "$PREVIEW_REPO" commit --quiet -m 'non-major PR change'
git -C "$PREVIEW_REPO" push --quiet origin pr
ln -s "$ROOT/node_modules" "$PREVIEW_REPO/node_modules"
PREVIEW_BIN="$TMP/preview-bin"
mkdir "$PREVIEW_BIN"
cat > "$PREVIEW_BIN/pnpm" <<EOF
#!/usr/bin/env bash
set -euo pipefail
[ "\$1" = exec ] && [ "\$2" = changeset ] && [ "\$3" = status ]
output=\${4#--output=}
printf '%s\n' \
  '{"releases":[{"name":"@youversion/platform-core","type":"major","oldVersion":"1.0.0","newVersion":"2.0.0"}]}' \
  > "\$output"
EOF
chmod +x "$PREVIEW_BIN/pnpm"

run_preview_case() {
  local name="$1" expected_introduced="$2" expected_output="$3"
  local output="$TMP/preview-output"
  local error="$TMP/preview-error"
  local preview="$PREVIEW_REPO/preview.json"
  local head_sha
  head_sha=$(git -C "$PREVIEW_REPO" rev-parse HEAD)
  : > "$output"
  rm -f "$preview"
  if (cd "$PREVIEW_REPO" && \
    PATH="$PREVIEW_BIN:$PATH" BASE_SHA="$PREVIEW_BASE_SHA" HEAD_SHA="$head_sha" \
    GITHUB_OUTPUT="$output" \
    bash "$TMP/preview.sh") >/dev/null 2> "$error" &&
    jq -e ".introduced_major == $expected_introduced" "$preview" >/dev/null &&
    grep -Fxq "is_major=$expected_output" "$output"; then
    pass "$name"
  else
    fail "$name" \
      "expected introduced_major=$expected_introduced and is_major=$expected_output; preview: $(cat "$preview" 2>/dev/null || true); output: $(tr '\n' ' ' < "$output"); error: $(tr '\n' ' ' < "$error")"
  fi
}

run_preview_case "stacked PRs ignore a major inherited from their target branch" false 0

cat > "$PREVIEW_REPO/.changeset/pr-major.md" <<'EOF'
---
"@youversion/platform-react-ui": major
---

Major change introduced by the pull request.
EOF
git -C "$PREVIEW_REPO" add .changeset/pr-major.md
git -C "$PREVIEW_REPO" commit --quiet -m 'PR major'
git -C "$PREVIEW_REPO" push --quiet origin pr
run_preview_case "stacked PRs require signoff for a newly introduced major" true 1

if grep -Fq 'Generated release PR; major signoff is enforced on source PRs.' "$WORKFLOW"; then
  pass "generated releases publish an explicit lifecycle-aware success"
else
  fail "generated releases publish an explicit lifecycle-aware success" "status wording is missing"
fi

printf '\n%d passed, %d failed\n' "$passes" "$failures"
[[ "$failures" -eq 0 ]]
