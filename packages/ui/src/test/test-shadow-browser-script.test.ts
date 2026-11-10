import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
    writeFileSync(
      fakeVitestPath,
      '#!/bin/sh\nprintf "%s\\t%s\\t%s\\n" "$VITEST_STORY_TAG" "${VITEST_STORY_EXCLUDE_TAG:-}" "$*" >> "$VITEST_LOG"\n',
    );
    chmodSync(fakeVitestPath, 0o755);

    execFileSync('sh', [scriptPath, '--', '--reporter=dot'], {
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH ?? ''}`,
        VITEST_BROWSER: 'firefox',
        VITEST_LOG: logPath,
      },
    });

    const invocations = readFileSync(logPath, 'utf8').trim().split('\n');
    expect(invocations).toEqual([
      'shadow-dom,cross-browser\tshadow-fresh-process,shadow-recovery\trun --project storybook --reporter=dot',
      'shadow-fresh-process\t\trun src/components/bible-reader.stories.tsx --project storybook --reporter=dot',
      'shadow-recovery\t\trun src/components/bible-card.stories.tsx --project storybook --reporter=dot',
      'shadow-recovery\t\trun src/components/verse-of-the-day.stories.tsx --project storybook --reporter=dot',
    ]);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
