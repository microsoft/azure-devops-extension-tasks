#!/usr/bin/env node

import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { promises as fs } from 'fs';
import { rollup } from 'rollup';
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
    external: ['tfx-cli', 'msalv1', 'msalv2', 'msalv3', 'shelljs'],
    runtimeAliasDependencySourcePackage: 'azure-pipelines-tasks-azure-arm-rest',
    runtimeAliasDependencies: ['msalv1', 'msalv2', 'msalv3'],
    bundledModuleResourcePackages: [
      'azure-pipelines-tasks-artifacts-common',
      'azure-pipelines-tasks-azure-arm-rest',
      'azure-pipelines-task-lib',
      'azure-pipelines-tool-lib',
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
    external: ['tfx-cli'],
    manifestSources: [
      'packages/github-action/package.json',
      'packages/core/package.json',
      'package.json',
    ],
    bundleFormat: 'esm',
  },
];

const targetSelectors = {
  azdo: (target) => target.packageDir === 'packages/azdo-task',
  actions: (target) => target.packageDir === 'packages/github-action',
  all: () => true,
};

function createExternalMatcher(externals) {
  return (id) =>
    externals.some((dependency) => id === dependency || id.startsWith(`${dependency}/`));
}

function getRollupOutputFormat(bundleFormat) {
  if (bundleFormat === 'esm') {
    return 'es';
  }

  if (bundleFormat === 'cjs') {
    return 'cjs';
  }

  throw new Error(`Unsupported bundle format '${bundleFormat}'`);
}

function getIntro(target) {
  if (target.bundleFormat !== 'esm') {
    return undefined;
  }

  return `
import { fileURLToPath as __internal_fileURLToPath } from 'node:url';
import { dirname as __internal_dirname } from 'node:path';
const __filename = __internal_fileURLToPath(import.meta.url);
const __dirname = __internal_dirname(__filename);
`;
}

function pathExists(fullPath) {
  return fs.access(fullPath).then(
    () => true,
    () => false
  );
}

function getResourcePackageForModuleId(moduleId, target) {
  const configuredPackages = target.bundledModuleResourcePackages || [];
  for (const packageName of configuredPackages) {
    const packageSegment = `${path.sep}node_modules${path.sep}${packageName}${path.sep}`;
    if (moduleId.includes(packageSegment)) {
      return packageName;
    }
  }

  return undefined;
}

function createModuleResourcePathRewritePlugin(target) {
  const configuredPackages = target.bundledModuleResourcePackages || [];

  return {
    name: 'rewrite-module-json-resource-paths',
    transform(code, id) {
      if (configuredPackages.length === 0) {
        return null;
      }

      const packageName = getResourcePackageForModuleId(id, target);
      if (!packageName) {
        return null;
      }

      const moduleJsonLookupPattern = /path\.join\(__dirname,\s*['\"]module\.json['\"]\)/g;
      const libJsonLookupPattern = /path\.join\(__dirname,\s*['\"]lib\.json['\"]\)/g;
      const packageJsonLookupPattern = /path\.join\(__dirname,\s*['\"]package\.json['\"]\)/g;
      if (
        !moduleJsonLookupPattern.test(code) &&
        !libJsonLookupPattern.test(code) &&
        !packageJsonLookupPattern.test(code)
      ) {
        return null;
      }

      const rewrittenCode = code
        .replace(
          moduleJsonLookupPattern,
          `path.join(__dirname, '__bundle_resources', '${packageName}', 'module.json')`
        )
        .replace(
          libJsonLookupPattern,
          `path.join(__dirname, '__bundle_resources', '${packageName}', 'lib.json')`
        )
        .replace(
          packageJsonLookupPattern,
          `path.join(__dirname, '__bundle_resources', '${packageName}', 'package.json')`
        );

      if (packageName === 'azure-pipelines-tasks-azure-arm-rest') {
        return {
          code: rewrittenCode
            .replace(
              /path\.join\(__dirname,\s*['\"]openssl3\.4\.2['\"],\s*['\"]openssl['\"]\)/g,
              "path.join(__dirname, '__bundle_resources', 'azure-pipelines-tasks-azure-arm-rest', 'openssl3.4.2', 'openssl')"
            )
            .replace(
              /path\.join\(__dirname,\s*['\"]openssl3\.4\.0['\"],\s*['\"]openssl['\"]\)/g,
              "path.join(__dirname, '__bundle_resources', 'azure-pipelines-tasks-azure-arm-rest', 'openssl3.4.0', 'openssl')"
            ),
          map: null,
        };
      }

      return {
        code: rewrittenCode,
        map: null,
      };
    },
  };
}

async function buildWithRollup(target) {
  const bundle = await rollup({
    input: path.join(rootDir, target.entryPoint),
    external: createExternalMatcher(target.external),
    plugins: [
      typescript({
        tsconfig: path.join(rootDir, target.packageDir, 'tsconfig.json'),
        module: 'Node16',
        moduleResolution: 'Node16',
        sourceMap: false,
        inlineSourceMap: false,
        declarationMap: false,
        outDir: path.join(rootDir, target.packageDir, 'dist'),
        outputToFilesystem: false,
      }),
      createModuleResourcePathRewritePlugin(target),
      nodeResolve({
        preferBuiltins: true,
      }),
      json({
        preferConst: true,
      }),
      commonjs({
        strictRequires: true,
        ignoreTryCatch: false,
        ignoreDynamicRequires: true,
      }),
    ],
    context: 'this',
  });

  try {
    await bundle.write({
      file: path.join(rootDir, target.outFile),
      format: getRollupOutputFormat(target.bundleFormat),
      sourcemap: false,
      exports: 'named',
      intro: getIntro(target),
      inlineDynamicImports: true,
    });
  } finally {
    await bundle.close();
  }
}

async function readJson(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  const raw = await fs.readFile(fullPath, 'utf-8');
  return JSON.parse(raw);
}

const cachedPackageManifests = new Map();

async function readPackageManifest(packageName) {
  const cached = cachedPackageManifests.get(packageName);
  if (cached) {
    return cached;
  }

  const manifestPath = path.join(rootDir, 'node_modules', packageName, 'package.json');
  const raw = await fs.readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(raw);
  cachedPackageManifests.set(packageName, manifest);
  return manifest;
}

let cachedRootLockfile;

async function readRootLockfile() {
  if (!cachedRootLockfile) {
    cachedRootLockfile = await readJson('package-lock.json');
  }

  return cachedRootLockfile;
}

function resolveLockedVersion(name, lockfile) {
  const lockfilePackage = lockfile?.packages?.[`node_modules/${name}`];
  if (!lockfilePackage?.version) {
    return undefined;
  }

  if (lockfilePackage.name && lockfilePackage.name !== name) {
    return `npm:${lockfilePackage.name}@${lockfilePackage.version}`;
  }

  return lockfilePackage.version;
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
  const lockfile = await readRootLockfile();
  const packageManifest = manifests[0];
  const dependencies = {};
  const aliasSourcePackage = target.runtimeAliasDependencySourcePackage;
  const aliasDependencies = new Set(target.runtimeAliasDependencies || []);
  const aliasSourceManifest = aliasSourcePackage
    ? await readPackageManifest(aliasSourcePackage)
    : undefined;

  for (const dependency of target.external) {
    let overrideVersion;
    if (aliasSourceManifest && aliasDependencies.has(dependency)) {
      overrideVersion = aliasSourceManifest.dependencies?.[dependency];
      if (!overrideVersion) {
        throw new Error(
          `Unable to resolve alias dependency '${dependency}' from '${aliasSourcePackage}' package.json`
        );
      }
    }

    const version =
      overrideVersion ??
      resolveLockedVersion(dependency, lockfile) ??
      resolveVersion(dependency, manifests);
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

async function copyRuntimeAssets(target) {
  const copies = target.runtimeAssetCopies || [];
  if (copies.length === 0) {
    return;
  }

  const distDir = path.join(rootDir, target.packageDir, 'dist');

  for (const copy of copies) {
    const sourcePath = path.join(rootDir, copy.from);
    const targetPath = path.join(distDir, copy.to);
    const sourceStat = await fs.lstat(sourcePath);

    await fs.rm(targetPath, { recursive: true, force: true });

    if (sourceStat.isDirectory()) {
      await fs.cp(sourcePath, targetPath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

async function copyBundledModuleResources(target) {
  const packageNames = target.bundledModuleResourcePackages || [];
  if (packageNames.length === 0) {
    return;
  }

  const distDir = path.join(rootDir, target.packageDir, 'dist');
  const resourceRoot = path.join(distDir, '__bundle_resources');

  await fs.mkdir(resourceRoot, { recursive: true });

  for (const packageName of packageNames) {
    const sourcePackageDir = path.join(rootDir, 'node_modules', packageName);
    const targetPackageDir = path.join(resourceRoot, packageName);

    await fs.mkdir(targetPackageDir, { recursive: true });

    const sourceModuleJson = path.join(sourcePackageDir, 'module.json');
    const targetModuleJson = path.join(targetPackageDir, 'module.json');
    const sourceLibJson = path.join(sourcePackageDir, 'lib.json');
    const targetLibJson = path.join(targetPackageDir, 'lib.json');
    const sourcePackageJson = path.join(sourcePackageDir, 'package.json');
    const targetPackageJson = path.join(targetPackageDir, 'package.json');

    if (await pathExists(sourceModuleJson)) {
      await fs.copyFile(sourceModuleJson, targetModuleJson);
    }

    if (await pathExists(sourceLibJson)) {
      await fs.copyFile(sourceLibJson, targetLibJson);
    }

    if (!(await pathExists(sourcePackageJson))) {
      throw new Error(
        `Missing required package.json for bundled package '${packageName}' at '${sourcePackageJson}'`
      );
    }

    await fs.copyFile(sourcePackageJson, targetPackageJson);

    const sourceStringsDir = path.join(sourcePackageDir, 'Strings');
    const targetStringsDir = path.join(targetPackageDir, 'Strings');

    if (await pathExists(sourceStringsDir)) {
      await fs.rm(targetStringsDir, { recursive: true, force: true });
      await fs.cp(sourceStringsDir, targetStringsDir, { recursive: true });
    }

    if (packageName === 'azure-pipelines-tasks-azure-arm-rest') {
      const openSslFolders = ['openssl3.4.0', 'openssl3.4.2'];

      for (const folderName of openSslFolders) {
        const sourceOpenSslDir = path.join(sourcePackageDir, folderName);
        const targetOpenSslDir = path.join(targetPackageDir, folderName);

        if (await pathExists(sourceOpenSslDir)) {
          await fs.rm(targetOpenSslDir, { recursive: true, force: true });
          await fs.cp(sourceOpenSslDir, targetOpenSslDir, { recursive: true });
        }
      }
    }
  }
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

const runtimeNpmFlags = [
  '--omit=dev',
  '--omit=optional',
  '--no-bin-links',
  '--install-links=false',
  '--ignore-scripts',
  '--no-audit',
  '--no-fund',
];

async function installRuntimeDependencies(target) {
  const distDir = path.join(rootDir, target.packageDir, 'dist');
  const nodeModulesDir = path.join(distDir, 'node_modules');

  const resetNodeModules = async () => {
    try {
      await fs.rm(nodeModulesDir, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 250,
      });
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
  };

  await resetNodeModules();

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const installArgs = ['install', ...runtimeNpmFlags];

  console.log(`Installing runtime dependencies for ${target.name}...`);
  try {
    await runCommand(npmCommand, installArgs, distDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/ENOTEMPTY/i.test(message)) {
      throw error;
    }

    console.warn(
      `Detected ENOTEMPTY during npm install for ${target.name}; retrying once after cleanup...`
    );
    await resetNodeModules();
    await runCommand(npmCommand, installArgs, distDir);
  }
}

async function dedupeRuntimeDependencies(target) {
  const distDir = path.join(rootDir, target.packageDir, 'dist');
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const dedupeArgs = ['dedupe', ...runtimeNpmFlags];

  // Run npm audit fix after install, do not fail if audit fix fails
  console.log(`Running 'npm audit fix' for ${target.name}...`);
  const auditFixCmd = [
    'audit',
    'fix',
    ...runtimeNpmFlags.filter((f) => !['--no-audit', '--no-fund'].includes(f)),
  ];
  if (process.platform === 'win32') {
    await runCommand('cmd.exe', ['/c', 'npm', ...auditFixCmd, '||', 'exit', '0'], distDir);
  } else {
    await runCommand('sh', ['-c', `npm ${auditFixCmd.join(' ')} || exit 0`], distDir);
  }

  console.log(`Deduping runtime dependencies for ${target.name}...`);
  await runCommand(npmCommand, dedupeArgs, distDir);
}

async function normalizeTextLineEndings(directory, { skipDirectories = new Set() } = {}) {
  const textExtensions = new Set([
    '.js',
    '.mjs',
    '.cjs',
    '.ts',
    '.mts',
    '.cts',
    '.json',
    '.jsonc',
    '.yaml',
    '.yml',
    '.md',
    '.txt',
    '.html',
    '.css',
    '.sh',
    '.cmd',
    '.bat',
    '.ps1',
    '.xml',
    '.svg',
  ]);

  try {
    await fs.access(directory);
  } catch {
    return;
  }

  const stack = [directory];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      // Skip files with extensions that are never text to avoid unnecessary reads.
      const ext = path.extname(entry.name).toLowerCase();
      if (ext && !textExtensions.has(ext)) {
        continue;
      }

      const content = await fs.readFile(fullPath);

      // Skip likely binary files.
      if (content.includes(0)) {
        continue;
      }

      const normalized = content.toString('utf8').replace(/\r\n/g, '\n');
      if (normalized !== content.toString('utf8')) {
        await fs.writeFile(fullPath, normalized, 'utf8');
      }
    }
  }
}

async function removeDeclarationArtifacts(directory) {
  try {
    await fs.access(directory);
  } catch {
    return;
  }

  const stack = [directory];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (/\.d\.ts(\.map)?$/i.test(entry.name)) {
        await fs.rm(fullPath, { force: true });
      }
    }
  }
}

async function removeMapArtifacts(directory) {
  try {
    await fs.access(directory);
  } catch {
    return;
  }

  const stack = [directory];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (/\.map$/i.test(entry.name)) {
        await fs.rm(fullPath, { force: true });
      }
    }
  }
}

function resolveTargetsFromArgs() {
  const mode = (process.argv[2] || 'all').toLowerCase();
  const selector = targetSelectors[mode];

  if (!selector) {
    throw new Error(`Unknown bundle target '${mode}'. Use one of: all, azdo, actions`);
  }

  const selectedTargets = targets.filter(selector);
  if (selectedTargets.length === 0) {
    throw new Error(`No bundle targets matched mode '${mode}'`);
  }

  return selectedTargets;
}

async function bundle() {
  const selectedTargets = resolveTargetsFromArgs();
  const bundleStart = performance.now();

  for (const target of selectedTargets) {
    const distDir = path.join(rootDir, target.packageDir, 'dist');
    const targetStart = performance.now();
    const step = (label) => {
      const elapsed = ((performance.now() - targetStart) / 1000).toFixed(1);
      console.log(`  [${elapsed}s] ${label}`);
    };

    console.log(`\nBundling ${target.name}...`);
    await buildWithRollup(target);
    step('rollup build');

    await removeDeclarationArtifacts(distDir);
    await removeMapArtifacts(distDir);
    step('remove artifacts');

    await writeRuntimeDependencyManifest(target);
    step('write dependency manifest');

    await installRuntimeDependencies(target);
    step('npm install');

    await dedupeRuntimeDependencies(target);
    step('npm dedupe + audit fix');

    // Normalize line endings in committed dist files (excludes node_modules which is not committed).
    // Only needed for the GitHub Action target; AzDO dist files are not committed.
    if (target.name === 'GitHub Action') {
      await normalizeTextLineEndings(distDir);
      step('normalize line endings');
    }

    await copyBundledModuleResources(target);
    step('copy bundled module resources');

    await copyRuntimeAssets(target);
    step('copy runtime assets');

    const totalSeconds = ((performance.now() - targetStart) / 1000).toFixed(1);
    console.log(`✓ ${target.name} bundled in ${totalSeconds}s`);
  }

  const grandTotal = ((performance.now() - bundleStart) / 1000).toFixed(1);
  if (selectedTargets.length > 1) {
    console.log(`\n✓ All targets bundled in ${grandTotal}s`);
  }
}

bundle().catch((err) => {
  console.error('Bundle failed:', err);
  process.exit(1);
});
