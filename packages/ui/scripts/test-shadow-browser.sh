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
  VITEST_STORY_TAG=shadow-dom,cross-browser \
    VITEST_STORY_EXCLUDE_TAG=shadow-fresh-process,shadow-recovery \
    vitest run --project storybook "$@"
  VITEST_STORY_TAG=shadow-fresh-process \
    vitest run src/components/bible-reader.stories.tsx --project storybook "$@"
  VITEST_STORY_TAG=shadow-recovery \
    vitest run src/components/bible-card.stories.tsx --project storybook "$@"
  VITEST_STORY_TAG=shadow-recovery \
    vitest run src/components/verse-of-the-day.stories.tsx --project storybook "$@"
else
  VITEST_STORY_TAG=shadow-dom,cross-browser \
    VITEST_STORY_EXCLUDE_TAG=shadow-recovery \
    vitest run --project storybook "$@"
  VITEST_STORY_TAG=shadow-recovery vitest run --project storybook "$@"
fi
