#!/usr/bin/env node

import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function bundle() {
  // Bundle Azure DevOps Task
  console.log('Bundling Azure DevOps Task...');
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'packages/azdo-task/src/main.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: path.join(rootDir, 'packages/azdo-task/dist/bundle.js'),
    sourcemap: true,
    external: [
      'azure-pipelines-task-lib',
      'azure-pipelines-tool-lib',
      'azure-pipelines-tasks-azure-arm-rest',
      'azure-devops-node-api',
      'tfx-cli',
    ],
  });
  console.log('✓ Azure DevOps Task bundled');

  // Bundle GitHub Action
  console.log('Bundling GitHub Action...');
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'packages/github-action/src/main.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: path.join(rootDir, 'packages/github-action/dist/bundle.js'),
    sourcemap: true,
    external: ['@actions/core', '@actions/exec', '@actions/tool-cache', '@actions/io', 'tfx-cli'],
  });
  console.log('✓ GitHub Action bundled');
}

bundle().catch((err) => {
  console.error('Bundle failed:', err);
  process.exit(1);
});
