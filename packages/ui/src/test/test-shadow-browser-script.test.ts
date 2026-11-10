import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it('keeps Firefox story isolation when forwarding option-only Vitest arguments', () => {
  const directory = mkdtempSync(join(tmpdir(), 'shadow-browser-script-'));
  const logPath = join(directory, 'vitest.log');
  const fakeVitestPath = join(directory, 'vitest');
  const scriptPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../scripts/test-shadow-browser.sh',
  );

  try {
    const storiesDirectory = join(directory, 'src/components');
    mkdirSync(storiesDirectory, { recursive: true });
    writeFileSync(
      join(storiesDirectory, 'reader.stories.tsx'),
      "tags: ['shadow-recovery', 'shadow-fresh-process']\n",
    );
    writeFileSync(join(storiesDirectory, 'card.stories.tsx'), "tags: ['shadow-recovery']\n");
    writeFileSync(join(storiesDirectory, 'future.stories.tsx'), "tags: ['shadow-recovery']\n");
    writeFileSync(
      fakeVitestPath,
      '#!/bin/sh\nprintf "%s\\t%s\\t%s\\n" "$VITEST_STORY_TAG" "${VITEST_STORY_EXCLUDE_TAG:-}" "$*" >> "$VITEST_LOG"\n',
    );
    chmodSync(fakeVitestPath, 0o755);

    execFileSync('sh', [scriptPath, '--', '--reporter=dot'], {
      cwd: directory,
      env: {
        ...process.env,
        PATH: `${directory}:${dirname(process.execPath)}:/usr/bin:/bin`,
        VITEST_BROWSER: 'firefox',
        VITEST_LOG: logPath,
      },
    });

    const invocations = readFileSync(logPath, 'utf8').trim().split('\n');
    expect(invocations).toEqual([
      'shadow-dom,cross-browser\tshadow-fresh-process,shadow-recovery\trun --project storybook --reporter=dot',
      'shadow-fresh-process\t\trun src/components/reader.stories.tsx --project storybook --reporter=dot',
      'shadow-recovery\t\trun src/components/card.stories.tsx --project storybook --reporter=dot',
      'shadow-recovery\t\trun src/components/future.stories.tsx --project storybook --reporter=dot',
      'shadow-recovery\t\trun src/components/reader.stories.tsx --project storybook --reporter=dot',
    ]);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
