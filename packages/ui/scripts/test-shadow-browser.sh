#!/bin/sh

set -eu

if [ "${1:-}" = -- ]; then
  shift
fi

has_story_filter=false
for argument in "$@"; do
  case "$argument" in
    *.stories.ts | *.stories.tsx) has_story_filter=true ;;
  esac
done

if [ "$has_story_filter" = true ]; then
  VITEST_STORY_TAG=shadow-dom,cross-browser vitest run --project storybook "$@"
  exit
fi

if [ "${VITEST_BROWSER:-chromium}" = firefox ]; then
  # Firefox replaces preview clients between serialized files, which resets
  # runtime MSW handlers. Discover every isolated file so future tagged stories
  # cannot silently fall out of the Firefox matrix.
  fresh_process_files=$(rg -l "['\"]shadow-fresh-process['\"]" src \
    --glob '*.stories.ts' --glob '*.stories.tsx' | sort)
  recovery_files=$(rg -l "['\"]shadow-recovery['\"]" src \
    --glob '*.stories.ts' --glob '*.stories.tsx' | sort)

  VITEST_STORY_TAG=shadow-dom,cross-browser \
    VITEST_STORY_EXCLUDE_TAG=shadow-fresh-process,shadow-recovery \
    vitest run --project storybook "$@"
  for story_file in $fresh_process_files; do
    VITEST_STORY_TAG=shadow-fresh-process \
      vitest run "$story_file" --project storybook "$@"
  done
  for story_file in $recovery_files; do
    VITEST_STORY_TAG=shadow-recovery \
      vitest run "$story_file" --project storybook "$@"
  done
else
  VITEST_STORY_TAG=shadow-dom,cross-browser \
    VITEST_STORY_EXCLUDE_TAG=shadow-recovery \
    vitest run --project storybook "$@"
  VITEST_STORY_TAG=shadow-recovery vitest run --project storybook "$@"
fi
