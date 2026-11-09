#!/bin/sh

set -eu

if [ "$#" -gt 0 ]; then
  VITEST_STORY_TAG=shadow-dom,cross-browser vitest run --project storybook "$@"
  exit
fi

if [ "${VITEST_BROWSER:-chromium}" = firefox ]; then
  VITEST_STORY_TAG=shadow-dom,cross-browser \
    VITEST_STORY_EXCLUDE_TAG=shadow-fresh-process,shadow-recovery \
    vitest run --project storybook
  VITEST_STORY_TAG=shadow-fresh-process \
    vitest run src/components/bible-reader.stories.tsx --project storybook
  VITEST_STORY_TAG=shadow-recovery \
    vitest run src/components/bible-card.stories.tsx --project storybook
  VITEST_STORY_TAG=shadow-recovery \
    vitest run src/components/verse-of-the-day.stories.tsx --project storybook
else
  VITEST_STORY_TAG=shadow-dom,cross-browser \
    VITEST_STORY_EXCLUDE_TAG=shadow-recovery \
    vitest run --project storybook
  VITEST_STORY_TAG=shadow-recovery vitest run --project storybook
fi
