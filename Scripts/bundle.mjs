#!/usr/bin/env node

import * as esbuild from 'esbuild';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const targets = [
  {
    name: 'Azure DevOps Task',
    packageDir: 'packages/azdo-task',
    entryPoint: 'packages/azdo-task/src/main.ts',
    outFile: 'packages/azdo-task/dist/bundle.js',
    external: [
      'azure-pipelines-task-lib',
      'azure-pipelines-tool-lib',
      'azure-pipelines-tasks-azure-arm-rest',
      'azure-devops-node-api',
      'tfx-cli',
    ],
    manifestSources: [
      'packages/azdo-task/package.json',
      'packages/core/package.json',
      'package.json',
    ],
    bundleFormat: 'cjs',
  },
  {
    name: 'GitHub Action',
    packageDir: 'packages/github-action',
    entryPoint: 'packages/github-action/src/main.ts',
    outFile: 'packages/github-action/dist/bundle.js',
    external: [
      '@actions/core',
      '@actions/exec',
      '@actions/tool-cache',
      '@actions/io',
      'tfx-cli',
      'yauzl',
      'yazl',
      'azure-devops-node-api',
    ],
    manifestSources: [
      'packages/github-action/package.json',
      'packages/core/package.json',
      'package.json',
    ],
    bundleFormat: 'esm',
  },
];

async function readJson(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  const raw = await fs.readFile(fullPath, 'utf-8');
  return JSON.parse(raw);
}

function resolveVersion(name, manifests) {
  for (const manifest of manifests) {
    if (manifest.dependencies?.[name]) {
      return manifest.dependencies[name];
    }
  }

  for (const manifest of manifests) {
    if (manifest.devDependencies?.[name]) {
      return manifest.devDependencies[name];
    }
  }

  return undefined;
}

async function writeRuntimeDependencyManifest(target) {
  const manifests = await Promise.all(target.manifestSources.map((source) => readJson(source)));
  const packageManifest = manifests[0];
  const dependencies = {};

  for (const dependency of target.external) {
    const version = resolveVersion(dependency, manifests);
    if (!version) {
      throw new Error(
        `Unable to resolve version for external dependency '${dependency}' in ${target.name}`
      );
    }
    dependencies[dependency] = version;
  }

  const distDir = path.join(rootDir, target.packageDir, 'dist');
  const distPackage = {
    name: `${packageManifest.name}-runtime`,
    private: true,
    license: packageManifest.license || 'MIT',
    type: target.bundleFormat === 'esm' ? 'module' : 'commonjs',
    dependencies,
  };

  await fs.writeFile(
    path.join(distDir, 'package.json'),
    JSON.stringify(distPackage, null, 2) + '\n'
  );
  await fs.writeFile(
    path.join(distDir, 'runtime-dependencies.json'),
    JSON.stringify({ external: target.external, dependencies }, null, 2) + '\n'
  );
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(`${command} ${args.join(' ')}`, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed (${code}): ${command} ${args.join(' ')}`));
    });
  });
}

function runCommandCapture(command, args, cwd) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const child = spawn(`${command} ${args.join(' ')}`, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(new Error(`Command failed (${code}): ${command} ${args.join(' ')}\n${stderr}`));
    });
  });
}

async function installRuntimeDependencies(target) {
  const distDir = path.join(rootDir, target.packageDir, 'dist');
  const nodeModulesDir = path.join(distDir, 'node_modules');

  try {
    await fs.rm(nodeModulesDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
  } catch {
    // Best effort; npm install can still proceed if node_modules was not present.
  }

  // On Windows, npm can fail with ENOTEMPTY when prior content still lingers.
  // Move any residual folder out of the way and delete it separately.
  try {
    await fs.access(nodeModulesDir);
    const staleDir = path.join(distDir, `node_modules.stale.${Date.now()}`);
    await fs.rename(nodeModulesDir, staleDir);
    await fs.rm(staleDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
  } catch {
    // No residual node_modules directory to handle.
  }

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const installArgs = [
    'install',
    '--omit=dev',
    '--no-package-lock',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
  ];

  console.log(`Installing runtime dependencies for ${target.name}...`);
  await runCommand(npmCommand, installArgs, distDir);
}

async function ensureExecutableBinScripts(target) {
  const binDir = path.join(rootDir, target.packageDir, 'dist', 'node_modules', '.bin');

  try {
    await fs.access(binDir);
  } catch {
    return;
  }

  const entries = await fs.readdir(binDir, { withFileTypes: true });
  const extensionlessScripts = entries
    .filter((entry) => entry.isFile() && path.extname(entry.name) === '')
    .map((entry) => entry.name);

  if (extensionlessScripts.length === 0) {
    return;
  }

  for (const scriptName of extensionlessScripts) {
    const scriptPath = path.join(binDir, scriptName);
    try {
      await fs.chmod(scriptPath, 0o755);
    } catch {
      // Best effort; Windows may not apply POSIX execute bits on disk.
    }
  }

  const relativePaths = extensionlessScripts.map((scriptName) =>
    path.posix.join(target.packageDir, 'dist', 'node_modules', '.bin', scriptName)
  );

  try {
    const trackedOutput = await runCommandCapture(
      'git',
      ['ls-files', '--', ...relativePaths],
      rootDir
    );
    const trackedPaths = new Set(
      trackedOutput
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    );
    const trackedExtensionlessScripts = relativePaths.filter((scriptPath) =>
      trackedPaths.has(scriptPath)
    );

    if (trackedExtensionlessScripts.length > 0) {
      await runCommand(
        'git',
        ['update-index', '--chmod=+x', '--', ...trackedExtensionlessScripts],
        rootDir
      );
      console.log(`Set executable bit on tracked .bin scripts for ${target.name}`);
    }
  } catch (error) {
    console.warn(`Unable to update git executable bits for ${target.name}: ${error.message}`);
  }
}

async function bundle() {
  for (const target of targets) {
    console.log(`Bundling ${target.name}...`);
    await esbuild.build({
      entryPoints: [path.join(rootDir, target.entryPoint)],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: target.bundleFormat,
      outfile: path.join(rootDir, target.outFile),
      sourcemap: true,
      external: target.external,
    });

    await writeRuntimeDependencyManifest(target);
    await installRuntimeDependencies(target);
    await ensureExecutableBinScripts(target);
    console.log(`✓ ${target.name} bundled`);
  }
}

bundle().catch((err) => {
  console.error('Bundle failed:', err);
  process.exit(1);
});
