import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vitest = path.join(packageDirectory, 'node_modules', '.bin', 'vitest');
const safariEnvironment = {
  ...process.env,
  VITEST_BROWSER: 'safari',
  VITEST_STORY_TAG: 'shadow-dom,cross-browser',
};
const dryRun = process.argv.includes('--dry-run');
const discoveryTimeout = 90_000;
const storyTimeout = Number(process.env.SAFARI_STORY_TIMEOUT_MS ?? 120_000);
const safariSessionRetryDelay = 2_000;
const maxSafariTransportAttempts = 3;
const safariSessionCreationFailure = 'Could not create a session';
const safariSessionUnavailable = 'Safari instance is already paired with another WebDriver session';
const safariBrowserConnectionFailure = 'Failed to connect to the browser session';
const safariAutomationProcess = 'Safari.app/Contents/MacOS/Safari .*--automation';

if (!Number.isFinite(storyTimeout) || storyTimeout <= 0) {
  throw new Error('SAFARI_STORY_TIMEOUT_MS must be a positive number');
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function runVitest(arguments_, options = {}) {
  return spawnSync(vitest, arguments_, {
    cwd: packageDirectory,
    env: options.environment ?? safariEnvironment,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    timeout: options.timeout,
  });
}

function printCapturedOutput(result) {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

function stopStaleSafariAutomation() {
  const result = spawnSync('pkill', ['-f', safariAutomationProcess], { encoding: 'utf8' });
  if (result.status !== 0 && result.status !== 1) {
    const detail = result.error?.message ?? result.stderr?.trim() ?? `exit code ${result.status}`;
    throw new Error(`Could not stop the stale Safari automation process: ${detail}`);
  }
}

function readStoryEvidence(resultPath, story) {
  try {
    const report = JSON.parse(readFileSync(resultPath, 'utf8'));
    const testResults = Array.isArray(report.testResults) ? report.testResults : [];
    const assertions = testResults.flatMap((testResult) =>
      Array.isArray(testResult.assertionResults) ? testResult.assertionResults : [],
    );
    const passedAssertions = assertions.filter(({ status }) => status === 'passed');
    const failedAssertions = assertions.filter(({ status }) => status === 'failed');
    const expectedFile = path.resolve(story.file);
    const reportedFiles = testResults.map(({ name }) => path.resolve(name));
    const failures = [];

    if (report.numPassedTests !== 1 || passedAssertions.length !== 1) {
      failures.push('expected exactly one passed assertion');
    }
    if (report.numFailedTests !== 0 || failedAssertions.length !== 0) {
      failures.push('expected zero failed assertions');
    }
    if (passedAssertions[0]?.fullName !== story.name) {
      failures.push(`passed assertion did not match ${JSON.stringify(story.name)}`);
    }
    if (testResults.length !== 1 || reportedFiles[0] !== expectedFile) {
      failures.push(`result file did not match ${JSON.stringify(expectedFile)}`);
    }

    return {
      valid: failures.length === 0,
      failure: failures.length > 0 ? failures.join('; ') : undefined,
    };
  } catch (error) {
    return {
      valid: false,
      failure: `missing or malformed Vitest JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'yv-safari-stories-'));
const discoveryPath = path.join(temporaryDirectory, 'stories.json');
let stories;

try {
  const discovery = runVitest(['list', '--project', 'storybook', `--json=${discoveryPath}`], {
    // Discovery is provider-independent. Using Playwright here prevents
    // SafariDriver from opening a throwaway session before the isolated runs.
    environment: {
      ...safariEnvironment,
      VITEST_BROWSER: 'chromium',
      VITEST_STORY_DISCOVERY: '1',
    },
    timeout: discoveryTimeout,
  });
  if (discovery.status !== 0) {
    const detail = discovery.error?.message ?? `exit code ${discovery.status ?? 'unknown'}`;
    throw new Error(`Story discovery failed: ${detail}`);
  }

  stories = JSON.parse(readFileSync(discoveryPath, 'utf8'));
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

if (!Array.isArray(stories) || stories.length === 0) {
  throw new Error('No focused Shadow DOM stories were discovered');
}

const duplicateKeys = stories
  .map(({ file, name }) => `${file}\0${name}`)
  .filter((key, index, keys) => keys.indexOf(key) !== index);
if (duplicateKeys.length > 0) {
  throw new Error('Story discovery returned duplicate file/name pairs');
}

console.log(`Discovered ${stories.length} focused Shadow DOM stories.`);
if (dryRun) {
  for (const { file, name } of stories) {
    console.log(`- ${path.relative(packageDirectory, file)} :: ${name}`);
  }
  process.exit(0);
}

const results = [];
const resultsDirectory = mkdtempSync(path.join(tmpdir(), 'yv-safari-results-'));
try {
  for (const [index, story] of stories.entries()) {
    const relativeFile = path.relative(packageDirectory, story.file);
    const startedAt = Date.now();
    console.log(`\n[${index + 1}/${stories.length}] ${relativeFile} :: ${story.name}`);

    let attempts = 0;
    let retryReason;
    let result;
    let resultPath;
    do {
      attempts += 1;
      resultPath = path.join(resultsDirectory, `${index + 1}-${attempts}.json`);
      result = runVitest(
        [
          'run',
          '--project',
          'storybook',
          relativeFile,
          '--testNamePattern',
          `^${escapeRegularExpression(story.name)}$`,
          '--reporter=verbose',
          '--reporter=json',
          `--outputFile.json=${resultPath}`,
          '--no-file-parallelism',
        ],
        { capture: true, timeout: storyTimeout },
      );
      printCapturedOutput(result);

      const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
      const previousSafariSessionStillPaired =
        output.includes(safariSessionCreationFailure) && output.includes(safariSessionUnavailable);
      const safariBrowserFailedToConnect = output.includes(safariBrowserConnectionFailure);
      const retryableSafariTransportFailure =
        previousSafariSessionStillPaired || safariBrowserFailedToConnect;
      if (
        result.error ||
        result.status === 0 ||
        !retryableSafariTransportFailure ||
        attempts === maxSafariTransportAttempts
      ) {
        break;
      }

      retryReason = safariBrowserFailedToConnect
        ? 'Safari failed to connect the Vitest browser session'
        : 'SafariDriver retained the previous WebDriver session';
      stopStaleSafariAutomation();
      console.warn(
        `${retryReason}; retrying ${relativeFile} :: ${story.name} ` +
          `(attempt ${attempts + 1}/${maxSafariTransportAttempts}).`,
      );
      await new Promise((resolve) => setTimeout(resolve, safariSessionRetryDelay));
    } while (attempts < maxSafariTransportAttempts);

    const timedOut = result.error?.code === 'ETIMEDOUT';
    const evidence = readStoryEvidence(resultPath, story);
    results.push({
      file: relativeFile,
      name: story.name,
      status: timedOut ? 'timed-out' : result.status === 0 && evidence.valid ? 'passed' : 'failed',
      exitCode: result.status,
      attempts,
      retryReason,
      evidenceFailure: evidence.failure,
      durationSeconds: Math.round((Date.now() - startedAt) / 100) / 10,
    });
  }
} finally {
  console.log('\nSafari focused-story summary:');
  console.table(results);
  console.log(JSON.stringify(results, null, 2));
  rmSync(resultsDirectory, { recursive: true, force: true });
}

const unsuccessful = results.filter(({ status }) => status !== 'passed');
if (unsuccessful.length > 0) {
  process.exitCode = 1;
}
