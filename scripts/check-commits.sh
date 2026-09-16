#!/usr/bin/env sh
set -eu

# Match .github/workflows/commitlint.yml, using the local branch HEAD.
if [ "$(git rev-parse --is-shallow-repository)" = "true" ]; then
  echo "Full history required. Run git fetch --unshallow origin, then retry." >&2
  exit 1
fi
git fetch --no-tags origin main:refs/remotes/origin/main
head=$(git rev-parse HEAD)
base=$(git merge-base origin/main "$head")
echo "Linting ${base}..${head}"
pnpm exec commitlint --from "$base" --to "$head" --verbose
