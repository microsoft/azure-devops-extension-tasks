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
  },
  {
    name: 'GitHub Action',
    packageDir: 'packages/github-action',
    entryPoint: 'packages/github-action/src/main.ts',
    outFile: 'packages/github-action/dist/bundle.js',
    external: ['@actions/core', '@actions/exec', '@actions/tool-cache', '@actions/io', 'tfx-cli'],
    manifestSources: [
      'packages/github-action/package.json',
      'packages/core/package.json',
      'package.json',
    ],
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
    type: packageManifest.type || 'commonjs',
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

async function installRuntimeDependencies(target) {
  const distDir = path.join(rootDir, target.packageDir, 'dist');
  const nodeModulesDir = path.join(distDir, 'node_modules');

  await fs.rm(nodeModulesDir, { recursive: true, force: true });

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

async function bundle() {
  for (const target of targets) {
    console.log(`Bundling ${target.name}...`);
    await esbuild.build({
      entryPoints: [path.join(rootDir, target.entryPoint)],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'cjs',
      outfile: path.join(rootDir, target.outFile),
      sourcemap: true,
      external: target.external,
    });

    await writeRuntimeDependencyManifest(target);
    await installRuntimeDependencies(target);
    console.log(`✓ ${target.name} bundled`);
  }
}

bundle().catch((err) => {
  console.error('Bundle failed:', err);
  process.exit(1);
});
