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

// ── Run tools and collect results ──

console.log(`\n${bold('Analyzing Platform ⚛ React SDK Monorepo...')}\n`);

// Knip (JSON output — run per workspace and merge for consistency with analyze-select)
let knipData = { files: [], issues: [] };
const knipWorkspaces = ['packages/core', 'packages/hooks', 'packages/ui'];

for (const ws of knipWorkspaces) {
  try {
    const raw = execSync(`${knipBin} --workspace ${ws} --reporter json 2>/dev/null`, {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    const jsonLine = raw.trim().split('\n').pop();
    const parsed = JSON.parse(jsonLine);
    knipData.files.push(...(parsed.files || []));
    knipData.issues.push(...(parsed.issues || []));
  } catch (err) {
    // Knip exits non-zero when it finds issues but still outputs JSON
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

// rev-dep (text output, captured)
let revDepOutput = '';
try {
  revDepOutput = execSync(
    `${revDep} config run --list-all-issues 2>&1`,
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
  );
} catch (err) {
  revDepOutput = err.stdout || err.stderr || '';
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
  const issue = typeof entry === 'object' && !Array.isArray(entry) ? entry : null;
  if (!issue) continue;

  for (const dep of issue.dependencies || []) {
    knip.unusedDeps.push({ file: issue.file, name: dep.name, line: dep.line });
  }
  for (const dep of issue.devDependencies || []) {
    knip.unusedDevDeps.push({ file: issue.file, name: dep.name, line: dep.line });
  }
  for (const exp of issue.exports || []) {
    knip.unusedExports.push({ file: issue.file, name: exp.name, line: exp.line });
  }
  for (const typ of issue.types || []) {
    knip.unusedTypes.push({ file: issue.file, name: typ.name, line: typ.line });
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

  if (line.includes('Circular Dependencies Issues') || line.includes('Circular Imports Issues')) {
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
// Section 1: Architecture (rev-dep only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log(bold(cyan('◆ Architecture & Boundaries')) + dim('  (rev-dep)'));
divider();

if (revdep.circularDeps.length > 0) {
  console.log(`  ${red('●')} ${bold('Circular Dependencies')} (${revdep.circularDeps.length})`);
  for (const cycle of revdep.circularDeps) {
    console.log(`    ${dim(cycle.rule + ':')} ${cycle.files.join(dim(' → '))}`);
  }
  totalIssues += revdep.circularDeps.length;
} else {
  console.log(`  ${green('✓')} No circular dependencies`);
}

if (revdep.restrictedImports.length > 0) {
  console.log(`  ${red('●')} ${bold('Restricted Import Violations')} (${revdep.restrictedImports.length})`);
  for (const item of revdep.restrictedImports) {
    console.log(`    ${dim(item.rule + '/')}${item.detail}`);
  }
  totalIssues += revdep.restrictedImports.length;
} else {
  console.log(`  ${green('✓')} No restricted import violations`);
}

if (revdep.unresolvedImports.length > 0) {
  console.log(`  ${red('●')} ${bold('Unresolved Imports')} (${revdep.unresolvedImports.length})`);
  for (const item of revdep.unresolvedImports) {
    console.log(`    ${dim(item.rule + '/')}${item.detail}`);
  }
  totalIssues += revdep.unresolvedImports.length;
} else {
  console.log(`  ${green('✓')} No unresolved imports`);
}

if (revdep.restrictedDevDeps.length > 0) {
  console.log(`  ${red('●')} ${bold('Dev Dependencies in Production')} (${revdep.restrictedDevDeps.length})`);
  for (const item of revdep.restrictedDevDeps) {
    console.log(`    ${dim(item.rule + '/')}${item.detail}`);
  }
  totalIssues += revdep.restrictedDevDeps.length;
} else {
  console.log(`  ${green('✓')} No dev dependencies used in production`);
}

if (revdep.unusedExports.length > 0) {
  console.log(`  ${red('●')} ${bold('Unused Exports (rev-dep)')} (${revdep.unusedExports.length})`);
  for (const item of revdep.unusedExports) {
    console.log(`    ${dim(item.rule + '/')}${item.detail}`);
  }
  totalIssues += revdep.unusedExports.length;
} else {
  console.log(`  ${green('✓')} No unused exports (rev-dep)`);
}

console.log();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Section 2: Dead Code (Knip — cross-package tracing)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log(bold(magenta('◆ Dead Code')) + dim('  (knip — cross-package tracing)'));
divider();

if (knip.unusedFiles.length > 0) {
  console.log(`  ${red('●')} ${bold('Unused Files')} (${knip.unusedFiles.length})`);
  for (const file of knip.unusedFiles) {
    console.log(`    ${file}`);
  }
  totalIssues += knip.unusedFiles.length;
} else {
  console.log(`  ${green('✓')} No unused files`);
}

if (knip.unusedExports.length > 0) {
  console.log(`  ${red('●')} ${bold('Unused Exports')} (${knip.unusedExports.length})`);
  for (const exp of knip.unusedExports) {
    console.log(`    ${exp.name}  ${dim(exp.file + ':' + exp.line)}`);
  }
  totalIssues += knip.unusedExports.length;
} else {
  console.log(`  ${green('✓')} No unused exports`);
}

if (knip.unusedTypes.length > 0) {
  console.log(`  ${red('●')} ${bold('Unused Exported Types')} (${knip.unusedTypes.length})`);
  for (const typ of knip.unusedTypes) {
    console.log(`    ${typ.name}  ${dim(typ.file + ':' + typ.line)}`);
  }
  totalIssues += knip.unusedTypes.length;
} else {
  console.log(`  ${green('✓')} No unused exported types`);
}

if (knip.duplicateExports.length > 0) {
  console.log(`  ${red('●')} ${bold('Duplicate Exports')} (${knip.duplicateExports.length})`);
  for (const dup of knip.duplicateExports) {
    console.log(`    ${dup.names.join(' | ')}  ${dim(dup.file)}`);
  }
  totalIssues += knip.duplicateExports.length;
} else {
  console.log(`  ${green('✓')} No duplicate exports`);
}

console.log();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Section 3: Orphan Files (rev-dep — per-package graph)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log(bold(yellow('◆ Orphan Files')) + dim('  (rev-dep — per-package import graph)'));
divider();

if (revdep.orphanFiles.length > 0) {
  console.log(`  ${red('●')} ${bold('Files not reachable from entry points')} (${revdep.orphanFiles.length})`);
  for (const item of revdep.orphanFiles) {
    console.log(`    ${item.file}`);
  }
  totalIssues += revdep.orphanFiles.length;
} else {
  console.log(`  ${green('✓')} All files reachable from entry points`);
}

console.log();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Section 4: Dependencies (Knip — cross-package)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log(bold(cyan('◆ Dependencies')) + dim('  (knip — cross-package)'));
divider();

if (knip.unusedDeps.length > 0) {
  console.log(`  ${red('●')} ${bold('Unused Dependencies')} (${knip.unusedDeps.length})`);
  for (const dep of knip.unusedDeps) {
    console.log(`    ${dep.name}  ${dim(dep.file)}`);
  }
  totalIssues += knip.unusedDeps.length;
} else {
  console.log(`  ${green('✓')} No unused dependencies`);
}

if (knip.unusedDevDeps.length > 0) {
  console.log(`  ${red('●')} ${bold('Unused Dev Dependencies')} (${knip.unusedDevDeps.length})`);
  for (const dep of knip.unusedDevDeps) {
    console.log(`    ${dep.name}  ${dim(dep.file)}`);
  }
  totalIssues += knip.unusedDevDeps.length;
} else {
  console.log(`  ${green('✓')} No unused dev dependencies`);
}

console.log();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Summary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

divider();
if (totalIssues === 0) {
  console.log(`\n  ${green(bold('✓ All checks passed!'))} No issues found.\n`);
} else {
  console.log(`\n  ${red(bold(`✗ ${totalIssues} issue${totalIssues === 1 ? '' : 's'} found.`))} See details above.\n`);
}
