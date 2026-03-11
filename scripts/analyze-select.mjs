#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const knipBin = resolve(repoRoot, 'node_modules', '.bin', 'knip');
const revDep = resolve(repoRoot, 'node_modules', '.bin', 'rev-dep');

// ── Colors & formatting ──

const bold = (s) => `\x1B[1m${s}\x1B[0m`;
const dim = (s) => `\x1B[2m${s}\x1B[0m`;
const cyan = (s) => `\x1B[36m${s}\x1B[0m`;
const red = (s) => `\x1B[31m${s}\x1B[0m`;
const green = (s) => `\x1B[32m${s}\x1B[0m`;
const yellow = (s) => `\x1B[33m${s}\x1B[0m`;
const magenta = (s) => `\x1B[35m${s}\x1B[0m`;

const divider = () => console.log(dim('─'.repeat(60)));

// ── Restore terminal on unexpected exit ──

process.on('SIGINT', () => {
  try { process.stdin.setRawMode(false); } catch {}
  process.stdin.pause();
  console.log('\nCancelled.');
  process.exit(0);
});

// ── Choices (no "all" — use `pnpm analyze` for that) ──

const CHOICES = [
  {
    label: 'packages/core',
    revDepRules: 'packages/core',
    knipWorkspace: 'packages/core',
  },
  {
    label: 'packages/hooks',
    revDepRules: 'packages/hooks',
    knipWorkspace: 'packages/hooks',
  },
  {
    label: 'packages/ui',
    revDepRules: 'packages/ui',
    knipWorkspace: 'packages/ui',
  },
  {
    label: 'tools',
    revDepRules: 'tools/eslint-config,tools/tsconfig',
    knipWorkspace: null, // tools are not knip workspaces
  },
];

// ── Interactive multi-select using raw terminal input ──

function multiSelect(choices) {
  return new Promise((resolvePromise) => {
    const selected = new Set();
    let cursor = 0;

    const render = () => {
      if (render.drawn) {
        process.stdout.write(`\x1B[${choices.length}A`);
      }
      for (let i = 0; i < choices.length; i++) {
        const check = selected.has(i) ? '\x1B[36m◉\x1B[0m' : '○';
        const pointer = i === cursor ? '\x1B[36m❯\x1B[0m' : ' ';
        const label =
          i === cursor
            ? `\x1B[1m${choices[i].label}\x1B[0m`
            : choices[i].label;
        process.stdout.write(`\x1B[2K${pointer} ${check} ${label}\n`);
      }
      render.drawn = true;
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    console.log(
      '\nAnalyze — select packages to check\n' +
        '(↑↓ Navigate,  ␣ Space to select item, ⏎ Enter to confirm)\n',
    );
    render();

    const onData = (key) => {
      // Ctrl-C
      if (key === '\x03') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        console.log('\nCancelled.');
        process.exit(0);
      }

      // Enter
      if (key === '\r' || key === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        console.log();
        resolvePromise([...selected]);
        return;
      }

      // Space — toggle
      if (key === ' ') {
        if (selected.has(cursor)) {
          selected.delete(cursor);
        } else {
          selected.add(cursor);
        }
        render();
        return;
      }

      // Arrow keys (escape sequences)
      if (key === '\x1B[A' || key === 'k') {
        cursor = (cursor - 1 + choices.length) % choices.length;
        render();
      } else if (key === '\x1B[B' || key === 'j') {
        cursor = (cursor + 1) % choices.length;
        render();
      }
    };

    process.stdin.on('data', onData);
  });
}

// ── Main ──

let indices = [];
while (indices.length === 0) {
  indices = await multiSelect(CHOICES);
  if (indices.length === 0) {
    console.log(
      'No packages selected — press the space bar to select at least one item.\n',
    );
  }
}

const selectedChoices = indices.map((i) => CHOICES[i]);
const selectedLabels = selectedChoices.map((c) => c.label).join(', ');

console.log(
  `\n${bold('Analyzing Platform ⚛ React SDK Monorepo...')}  ${dim(`(${selectedLabels})`)}\n`,
);

// ── Build rev-dep command ──

const revDepRules = [
  ...new Set(
    selectedChoices
      .map((c) => c.revDepRules)
      .flatMap((r) => r.split(',')),
  ),
].join(',');

// ── Build knip workspace flags ──

const knipWorkspaces = selectedChoices
  .map((c) => c.knipWorkspace)
  .filter(Boolean);

// ── Run rev-dep (scoped) ──

let revDepOutput = '';
try {
  const cmd = `${revDep} config run --list-all-issues --rules ${revDepRules}`;
  revDepOutput = execSync(`${cmd} 2>&1`, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
} catch (err) {
  revDepOutput = err.stdout || err.stderr || '';
}

// ── Run knip (scoped per workspace, then merge) ──

let knipData = { files: [], issues: [] };

if (knipWorkspaces.length > 0) {
  for (const ws of knipWorkspaces) {
    try {
      const raw = execSync(
        `${knipBin} --workspace ${ws} --reporter json 2>/dev/null`,
        { cwd: repoRoot, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
      );
      const jsonLine = raw.trim().split('\n').pop();
      const parsed = JSON.parse(jsonLine);
      knipData.files.push(...(parsed.files || []));
      knipData.issues.push(...(parsed.issues || []));
    } catch (err) {
      if (err.stdout) {
        try {
          const jsonLine = err.stdout.trim().split('\n').pop();
          const parsed = JSON.parse(jsonLine);
          knipData.files.push(...(parsed.files || []));
          knipData.issues.push(...(parsed.issues || []));
        } catch {
          console.log(yellow(`⚠ Could not parse Knip output for ${ws}`));
        }
      }
    }
  }
}

// ── Parse Knip results ──

const knip = {
  unusedFiles: knipData.files || [],
  unusedDeps: [],
  unusedDevDeps: [],
  unusedExports: [],
  unusedTypes: [],
  duplicateExports: [],
};

for (const entry of knipData.issues || []) {
  const issue =
    typeof entry === 'object' && !Array.isArray(entry) ? entry : null;
  if (!issue) continue;

  for (const dep of issue.dependencies || []) {
    knip.unusedDeps.push({ file: issue.file, name: dep.name, line: dep.line });
  }
  for (const dep of issue.devDependencies || []) {
    knip.unusedDevDeps.push({
      file: issue.file,
      name: dep.name,
      line: dep.line,
    });
  }
  for (const exp of issue.exports || []) {
    knip.unusedExports.push({
      file: issue.file,
      name: exp.name,
      line: exp.line,
    });
  }
  for (const typ of issue.types || []) {
    knip.unusedTypes.push({
      file: issue.file,
      name: typ.name,
      line: typ.line,
    });
  }
  for (const dups of issue.duplicates || []) {
    if (dups.length > 0) {
      knip.duplicateExports.push({
        file: issue.file,
        names: dups.map((d) => d.name),
      });
    }
  }
}

// ── Parse rev-dep results ──

const revdep = {
  circularDeps: [],
  orphanFiles: [],
  restrictedImports: [],
  unresolvedImports: [],
  unusedExports: [],
  restrictedDevDeps: [],
};

let currentRule = '';
let currentSection = '';
let currentCycle = null;

for (const line of revDepOutput.split('\n')) {
  const ruleMatch = line.match(/^📁 Rule: (.+?) \(/);
  if (ruleMatch) {
    currentRule = ruleMatch[1];
    currentSection = '';
    currentCycle = null;
    continue;
  }

  if (
    line.includes('Circular Dependencies Issues') ||
    line.includes('Circular Imports Issues')
  ) {
    currentSection = 'circular';
  } else if (line.includes('Orphan Files Issues')) {
    currentSection = 'orphan';
    currentCycle = null;
  } else if (line.includes('Restricted Imports Issues')) {
    currentSection = 'restricted';
    currentCycle = null;
  } else if (line.includes('Unresolved Imports Issues')) {
    currentSection = 'unresolved';
    currentCycle = null;
  } else if (line.includes('Unused Exports Issues')) {
    currentSection = 'unusedExports';
    currentCycle = null;
  } else if (line.includes('Restricted Dev Dependencies')) {
    currentSection = 'restrictedDev';
    currentCycle = null;
  } else if (line.match(/^\s+[✅❌⚠️]/)) {
    currentSection = '';
    currentCycle = null;
  }

  // Parse circular dependency cycles (➞ arrow format)
  if (currentSection === 'circular') {
    const cycleHeader = line.match(/Circular Dependency (\d+):/);
    if (cycleHeader) {
      currentCycle = { rule: currentRule, files: [] };
      revdep.circularDeps.push(currentCycle);
      continue;
    }
    const arrowMatch = line.match(/➞\s+(.+?)(?:\s+\(|$)/);
    if (arrowMatch && currentCycle) {
      currentCycle.files.push(arrowMatch[1].trim());
      continue;
    }
  }

  const itemMatch = line.match(/^\s+- (.+)/);
  if (itemMatch && currentSection && currentSection !== 'circular') {
    const item = itemMatch[1].trim();
    switch (currentSection) {
      case 'orphan':
        revdep.orphanFiles.push({ rule: currentRule, file: item });
        break;
      case 'restricted':
        revdep.restrictedImports.push({ rule: currentRule, detail: item });
        break;
      case 'unresolved':
        revdep.unresolvedImports.push({ rule: currentRule, detail: item });
        break;
      case 'unusedExports':
        revdep.unusedExports.push({ rule: currentRule, detail: item });
        break;
      case 'restrictedDev':
        revdep.restrictedDevDeps.push({ rule: currentRule, detail: item });
        break;
    }
  }
}

// ── Display unified report ──

let totalIssues = 0;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Section 1: Architecture (rev-dep)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log(bold(cyan('◆ Architecture & Boundaries')) + dim('  (rev-dep)'));
divider();

if (revdep.circularDeps.length > 0) {
  console.log(
    `  ${red('●')} ${bold('Circular Dependencies')} (${revdep.circularDeps.length})`,
  );
  for (const cycle of revdep.circularDeps) {
    console.log(
      `    ${dim(cycle.rule + ':')} ${cycle.files.join(dim(' → '))}`,
    );
  }
  totalIssues += revdep.circularDeps.length;
} else {
  console.log(`  ${green('✓')} No circular dependencies`);
}

if (revdep.restrictedImports.length > 0) {
  console.log(
    `  ${red('●')} ${bold('Restricted Import Violations')} (${revdep.restrictedImports.length})`,
  );
  for (const item of revdep.restrictedImports) {
    console.log(`    ${dim(item.rule + '/')}${item.detail}`);
  }
  totalIssues += revdep.restrictedImports.length;
} else {
  console.log(`  ${green('✓')} No restricted import violations`);
}

if (revdep.unresolvedImports.length > 0) {
  console.log(
    `  ${red('●')} ${bold('Unresolved Imports')} (${revdep.unresolvedImports.length})`,
  );
  for (const item of revdep.unresolvedImports) {
    console.log(`    ${dim(item.rule + '/')}${item.detail}`);
  }
  totalIssues += revdep.unresolvedImports.length;
} else {
  console.log(`  ${green('✓')} No unresolved imports`);
}

if (revdep.restrictedDevDeps.length > 0) {
  console.log(
    `  ${red('●')} ${bold('Dev Dependencies in Production')} (${revdep.restrictedDevDeps.length})`,
  );
  for (const item of revdep.restrictedDevDeps) {
    console.log(`    ${dim(item.rule + '/')}${item.detail}`);
  }
  totalIssues += revdep.restrictedDevDeps.length;
} else {
  console.log(`  ${green('✓')} No dev dependencies used in production`);
}

console.log();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Section 2: Dead Code (Knip)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (knipWorkspaces.length > 0) {
  console.log(
    bold(magenta('◆ Dead Code')) + dim('  (knip — cross-package tracing)'),
  );
  divider();

  if (knip.unusedFiles.length > 0) {
    console.log(
      `  ${red('●')} ${bold('Unused Files')} (${knip.unusedFiles.length})`,
    );
    for (const file of knip.unusedFiles) {
      console.log(`    ${file}`);
    }
    totalIssues += knip.unusedFiles.length;
  } else {
    console.log(`  ${green('✓')} No unused files`);
  }

  if (knip.unusedExports.length > 0) {
    console.log(
      `  ${red('●')} ${bold('Unused Exports')} (${knip.unusedExports.length})`,
    );
    for (const exp of knip.unusedExports) {
      console.log(`    ${exp.name}  ${dim(exp.file + ':' + exp.line)}`);
    }
    totalIssues += knip.unusedExports.length;
  } else {
    console.log(`  ${green('✓')} No unused exports`);
  }

  if (knip.unusedTypes.length > 0) {
    console.log(
      `  ${red('●')} ${bold('Unused Exported Types')} (${knip.unusedTypes.length})`,
    );
    for (const typ of knip.unusedTypes) {
      console.log(`    ${typ.name}  ${dim(typ.file + ':' + typ.line)}`);
    }
    totalIssues += knip.unusedTypes.length;
  } else {
    console.log(`  ${green('✓')} No unused exported types`);
  }

  if (knip.duplicateExports.length > 0) {
    console.log(
      `  ${red('●')} ${bold('Duplicate Exports')} (${knip.duplicateExports.length})`,
    );
    for (const dup of knip.duplicateExports) {
      console.log(`    ${dup.names.join(' | ')}  ${dim(dup.file)}`);
    }
    totalIssues += knip.duplicateExports.length;
  } else {
    console.log(`  ${green('✓')} No duplicate exports`);
  }

  console.log();
} else {
  console.log(
    bold(magenta('◆ Dead Code')) +
      dim('  (skipped — no knip workspaces in selection)'),
  );
  divider();
  console.log(`  ${dim('Select a package (core, hooks, ui) for dead code analysis')}`);
  console.log();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Section 3: Orphan Files (rev-dep)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log(
  bold(yellow('◆ Orphan Files')) +
    dim('  (rev-dep — per-package import graph)'),
);
divider();

if (revdep.orphanFiles.length > 0) {
  console.log(
    `  ${red('●')} ${bold('Files not reachable from entry points')} (${revdep.orphanFiles.length})`,
  );
  for (const item of revdep.orphanFiles) {
    console.log(`    ${item.file}`);
  }
  totalIssues += revdep.orphanFiles.length;
} else {
  console.log(`  ${green('✓')} All files reachable from entry points`);
}

console.log();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Section 4: Dependencies (Knip)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (knipWorkspaces.length > 0) {
  console.log(bold(cyan('◆ Dependencies')) + dim('  (knip — cross-package)'));
  divider();

  if (knip.unusedDeps.length > 0) {
    console.log(
      `  ${red('●')} ${bold('Unused Dependencies')} (${knip.unusedDeps.length})`,
    );
    for (const dep of knip.unusedDeps) {
      console.log(`    ${dep.name}  ${dim(dep.file)}`);
    }
    totalIssues += knip.unusedDeps.length;
  } else {
    console.log(`  ${green('✓')} No unused dependencies`);
  }

  if (knip.unusedDevDeps.length > 0) {
    console.log(
      `  ${red('●')} ${bold('Unused Dev Dependencies')} (${knip.unusedDevDeps.length})`,
    );
    for (const dep of knip.unusedDevDeps) {
      console.log(`    ${dep.name}  ${dim(dep.file)}`);
    }
    totalIssues += knip.unusedDevDeps.length;
  } else {
    console.log(`  ${green('✓')} No unused dev dependencies`);
  }

  console.log();
} else {
  console.log(
    bold(cyan('◆ Dependencies')) +
      dim('  (skipped — no knip workspaces in selection)'),
  );
  divider();
  console.log(`  ${dim('Select a package (core, hooks, ui) for dependency analysis')}`);
  console.log();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Summary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

divider();
if (totalIssues === 0) {
  console.log(
    `\n  ${green(bold('✓ All checks passed!'))} No issues found.\n`,
  );
} else {
  console.log(
    `\n  ${red(bold(`✗ ${totalIssues} issue${totalIssues === 1 ? '' : 's'} found.`))} See details above.\n`,
  );
}
