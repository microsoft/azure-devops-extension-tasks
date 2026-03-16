/**
 * Idempotent version update script for release automation.
 *
 * Updates version references across the entire repository:
 * - package.json files (root + workspace packages)
 * - vss-extension.json
 * - packages/azdo-task/task.json (Major/Minor/Patch)
 * - Composite action.yaml files (uses: jessehouwing/azdo-marketplace@...)
 * - Documentation and examples (GitHub Actions @vX.Y.Z, Azure Pipelines @major)
 * - Root action.yml output description examples
 *
 * Usage: node Scripts/update-version.mjs <version>
 * Example: node Scripts/update-version.mjs 6.1.0
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: node Scripts/update-version.mjs <version>');
  console.error('Version must be in format x.y.z (e.g., 6.1.0)');
  process.exit(1);
}

const [major, minor, patch] = version.split('.').map(Number);
let updatedCount = 0;
let skippedCount = 0;

// 1. Update package.json files
const packageJsonPaths = [
  'package.json',
  'packages/core/package.json',
  'packages/azdo-task/package.json',
  'packages/github-action/package.json',
];

for (const p of packageJsonPaths) {
  const filePath = path.join(rootDir, p);
  const raw = await fs.readFile(filePath, 'utf-8');
  const content = JSON.parse(raw);
  content.version = version;
  await fs.writeFile(filePath, JSON.stringify(content, null, 2) + '\n');
  console.log(`✓ ${p} → version ${version}`);
  updatedCount++;
}

// 2. Update vss-extension.json
const vssPath = path.join(rootDir, 'vss-extension.json');
const vssRaw = await fs.readFile(vssPath, 'utf-8');
const vssContent = JSON.parse(vssRaw);
vssContent.version = version;
await fs.writeFile(vssPath, JSON.stringify(vssContent, null, 2) + '\n');
console.log(`✓ vss-extension.json → version ${version}`);
updatedCount++;

// 3. Update task.json
const taskPath = path.join(rootDir, 'packages/azdo-task/task.json');
const taskRaw = await fs.readFile(taskPath, 'utf-8');
const taskContent = JSON.parse(taskRaw);
taskContent.version.Major = major;
taskContent.version.Minor = minor;
taskContent.version.Patch = patch;
await fs.writeFile(taskPath, JSON.stringify(taskContent, null, 2) + '\n');
console.log(`✓ packages/azdo-task/task.json → version ${major}.${minor}.${patch}`);
updatedCount++;

// 4. Update composite action.yaml files
// These reference jessehouwing/azdo-marketplace@main (or any ref) in both:
//   - runs.steps[].uses (the actual action reference)
//   - description examples (documentation)
const actionDirs = [
  'package',
  'publish',
  'unpublish',
  'share',
  'unshare',
  'install',
  'show',
  'query-version',
  'wait-for-validation',
  'wait-for-installation',
];

for (const dir of actionDirs) {
  const actionPath = path.join(rootDir, dir, 'action.yaml');
  let content = await fs.readFile(actionPath, 'utf-8');
  content = content.replace(
    /jessehouwing\/azdo-marketplace(@\S+)/g,
    `jessehouwing/azdo-marketplace@v${version}`
  );
  await fs.writeFile(actionPath, content);
  console.log(`✓ ${dir}/action.yaml → @v${version}`);
  updatedCount++;
}

// 5. Update root action.yml (output description examples use @v6)
const rootActionPath = path.join(rootDir, 'action.yml');
let rootActionContent = await fs.readFile(rootActionPath, 'utf-8');
rootActionContent = rootActionContent.replace(
  /jessehouwing\/azdo-marketplace(@\S+)/g,
  `jessehouwing/azdo-marketplace@v${version}`
);
await fs.writeFile(rootActionPath, rootActionContent);
console.log(`✓ action.yml → @v${version}`);
updatedCount++;

// 6. Update documentation files (GitHub Actions references)
// Pattern: jessehouwing/azdo-marketplace@vX or jessehouwing/azdo-marketplace/subaction@vX
const docFiles = [
  'README.md',
  'docs/README.md',
  'docs/github-actions.md',
  'docs/azure-pipelines.md',
  'docs/authentication-and-oidc.md',
  'docs/migrate-azure-pipelines-v5-to-github-actions.md',
  'docs/migrate-azure-pipelines-v5-to-v6.md',
  'docs/migrate-azure-pipelines-v6-to-github-actions.md',
];

for (const f of docFiles) {
  const filePath = path.join(rootDir, f);
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    // GitHub Actions references: jessehouwing/azdo-marketplace[/subpath]@ref
    content = content.replace(
      /(jessehouwing\/azdo-marketplace(?:\/[a-z-]+)?@)[0-9A-Za-z._/-]+/g,
      `$1v${version}`
    );
    // Azure Pipelines task references: azdo-marketplace@N (major version only)
    content = content.replace(/azdo-marketplace@\d+/g, `azdo-marketplace@${major}`);
    await fs.writeFile(filePath, content);
    console.log(`✓ ${f} → @v${version} (actions), @${major} (pipelines)`);
    updatedCount++;
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.log(`⊘ ${f} (not found, skipped)`);
      skippedCount++;
    } else {
      throw e;
    }
  }
}

// 7. Update README.md files in composite action directories
for (const dir of actionDirs) {
  const readmePath = path.join(rootDir, dir, 'README.md');
  try {
    let content = await fs.readFile(readmePath, 'utf-8');
    content = content.replace(
      /jessehouwing\/azdo-marketplace(\/[a-z-]+)?@\S+/g,
      (match, subpath) => `jessehouwing/azdo-marketplace${subpath || ''}@v${version}`
    );
    await fs.writeFile(readmePath, content);
    console.log(`✓ ${dir}/README.md → @v${version}`);
    updatedCount++;
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.log(`⊘ ${dir}/README.md (not found, skipped)`);
      skippedCount++;
    } else {
      throw e;
    }
  }
}

// 8. Update example files
const exampleDir = path.join(rootDir, 'docs/examples');
try {
  const examples = await fs.readdir(exampleDir);
  for (const file of examples) {
    if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
    const filePath = path.join(exampleDir, file);
    let content = await fs.readFile(filePath, 'utf-8');
    // GitHub Actions references
    content = content.replace(
      /jessehouwing\/azdo-marketplace(\/[a-z-]+)?@\S+/g,
      (match, subpath) => `jessehouwing/azdo-marketplace${subpath || ''}@v${version}`
    );
    // Azure Pipelines task references
    content = content.replace(/azdo-marketplace@\d+/g, `azdo-marketplace@${major}`);
    await fs.writeFile(filePath, content);
    console.log(`✓ docs/examples/${file} → @v${version} (actions), @${major} (pipelines)`);
    updatedCount++;
  }
} catch (e) {
  if (e.code === 'ENOENT') {
    console.log('⊘ docs/examples/ (not found, skipped)');
    skippedCount++;
  } else {
    throw e;
  }
}

// 9. Update Azure Pipelines YAML files
const pipelinesDir = path.join(rootDir, '.github/pipelines');
try {
  const pipelines = await fs.readdir(pipelinesDir);
  for (const file of pipelines) {
    if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
    const filePath = path.join(pipelinesDir, file);
    let content = await fs.readFile(filePath, 'utf-8');
    content = content.replace(/azdo-marketplace@\d+/g, `azdo-marketplace@${major}`);
    await fs.writeFile(filePath, content);
    console.log(`✓ .github/pipelines/${file} → @${major}`);
    updatedCount++;
  }
} catch (e) {
  if (e.code === 'ENOENT') {
    console.log('⊘ .github/pipelines/ (not found, skipped)');
    skippedCount++;
  } else {
    throw e;
  }
}

console.log(
  `\n✅ Version update complete: ${version} (${updatedCount} files updated${skippedCount > 0 ? `, ${skippedCount} skipped` : ''})`
);
