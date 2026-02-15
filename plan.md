# Refactoring Plan: Unified Azure DevOps Extension Task

## Executive Summary

Consolidate 10 separate Azure DevOps pipeline tasks into a **single unified task** with a shared, platform-agnostic core library. Simultaneously ship a **GitHub Actions** implementation using the same core. Drop Visual Studio extension support. Break backward compatibility intentionally for a clean v6 release.

---

## Table of Contents

1. [Goals & Non-Goals](#1-goals--non-goals)
2. [Architecture Overview](#2-architecture-overview)
3. [Repository Structure](#3-repository-structure)
4. [Phase 1 — Core Library](#4-phase-1--core-library-packagescoreextension-tasks-core)
5. [Phase 2 — Azure Pipelines Task](#5-phase-2--azure-pipelines-task)
6. [Phase 3 — GitHub Actions Implementation](#6-phase-3--github-actions-implementation)
7. [Phase 4 — VSIX Editor Rewrite](#7-phase-4--vsix-editor-rewrite)
8. [Phase 5 — Testing Strategy](#8-phase-5--testing-strategy)
9. [Phase 6 — Build, Bundle & Size Optimization](#9-phase-6--build-bundle--size-optimization)
10. [Phase 7 — CI/CD Pipeline](#10-phase-7--cicd-pipeline)
11. [Phase 8 — Migration & Documentation](#11-phase-8--migration--documentation)
12. [Consolidated Input Schema](#12-consolidated-input-schema)
13. [Command-to-Input Mapping](#13-command-to-input-mapping)
14. [Issue Resolutions](#14-issue-resolutions)
15. [Risk Register](#15-risk-register)
16. [Resolved Questions](#16-resolved-questions)

---

## 1. Goals & Non-Goals

### Goals

- **Single task, multiple commands**: One pipeline task with a `command` selector (`package`, `publish`, `unpublish`, `share`, `unshare`, `install`, `show`, `isValid`, `verifyInstall`)
- **Platform-agnostic core**: The business logic must NOT depend on `azure-pipelines-task-lib` or `@actions/core` directly — abstractions only
- **Dual-platform delivery**: Ship as both an Azure DevOps extension (v6) and a GitHub Action
- **Embedded tfx with override**: Bundle a known-good tfx version; allow users to specify an exact version for backward compat with older Azure DevOps Server
- **Comprehensive testing**: Unit tests with **Jest** for every module, integration tests for CLI interactions, run on all supported hosted CI agents/runners
- **Minimal bundle size**: Tree-shake, bundle with **Rollup**, prune aggressively — single-file output per consumer
- **Code quality**: **TypeScript 6**, **ESLint** (flat config), **Prettier** for consistent formatting
- **Cross-platform**: Must work on both `windows-latest` and `ubuntu-latest` (and all other hosted CI images)
- **Node versions**: Azure Pipelines task targets **Node 24** (primary) and **Node 20** (fallback). GitHub Action targets **Node 24**
- **Support all tfx extension flags**: Including recently added `--manifest-js`, `--env`, `--json5`, `--rev-version`, `--unshare-with`, `--bypass-scope-check`, `--display-name`, `--description`
- **Resolve open issues**: #205, #189, #39, #188, #172

### Non-Goals

- Visual Studio extension publishing (`VsixPublisher.exe`) — **dropped**
- Visual Studio Code extension publishing — **dropped**
- Server-side / gate task (HttpRequest-based `IsValidExtension`) — retained as-is (replaced by agent-based `isValid` with retry). Not available in Github Actions.
- Backward compatibility with v5 task inputs or task IDs

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Consumer Layers                              │
│  ┌───────────────────────────┐  ┌────────────────────────────────┐  │
│  │  Azure Pipelines Task v6  │  │  GitHub Action (action.yml)    │  │
│  │  task.json + thin adapter │  │  thin adapter                  │  │
│  │  Uses: task-lib, tool-lib │  │  Uses: @actions/core, exec,   │  │
│  │        azure-arm-rest     │  │        tool-cache, io          │  │
│  └────────────┬──────────────┘  └────────────┬───────────────────┘  │
│               │                               │                     │
│               ▼                               ▼                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              Platform Abstraction Layer                        │ │
│  │  IPlatformAdapter interface                                   │ │
│  │  - getInput / getBoolInput / getDelimitedInput                │ │
│  │  - setOutput / setResult / setSecret / setVariable            │ │
│  │  - debug / info / warning / error                             │ │
│  │  - which / exec / execAsync                                   │ │
│  │  - findMatch (glob) / fileExists / readFile / writeFile       │ │
│  │  - getVariable / cacheDir / downloadTool                      │ │
│  └────────────────────────────┬───────────────────────────────────┘ │
│                               │                                     │
│                               ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Core Library                                │ │
│  │  @extension-tasks/core                                        │ │
│  │                                                               │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌───────────────────────┐  │ │
│  │  │ TfxManager   │ │ AuthProvider │ │ VsixEditor            │  │ │
│  │  │ - install    │ │ - PAT        │ │ - patch identity      │  │ │
│  │  │ - resolve    │ │ - OIDC/Entra │ │ - patch tasks         │  │ │
│  │  │ - execute    │ │              │ │ - patch contributions  │  │ │
│  │  └──────────────┘ └──────────────┘ └───────────────────────┘  │ │
│  │                                                               │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌───────────────────────┐  │ │
│  │  │ Commands     │ │ ArgBuilder   │ │ VersionUtils          │  │ │
│  │  │ - package    │ │ - fluent API │ │ - parse / increment   │  │ │
│  │  │ - publish    │ │ - from input │ │ - task version patch  │  │ │
│  │  │ - share      │ │              │ │ - task ID generation  │  │ │
│  │  │ - install    │ │              │ │                       │  │ │
│  │  │ - show       │ │              │ │                       │  │ │
│  │  │ - isValid    │ │              │ │                       │  │ │
│  │  │ - unpublish  │ │              │ │                       │  │ │
│  │  │ - unshare    │ │              │ │                       │  │ │
│  │  │ - verifyInst │ │              │ │                       │  │ │
│  │  └──────────────┘ └──────────────┘ └───────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **`IPlatformAdapter` interface**: Abstracts ALL platform-specific operations (input reading, logging, exec, filesystem, tool caching). The core library never imports platform-specific packages directly.

2. **Command pattern**: Each tfx subcommand is a function that accepts a typed options object and an `IPlatformAdapter`, builds args, executes tfx, and returns a typed result.

3. **`TfxManager`**: Responsible for locating/installing/caching the tfx binary. Supports "embedded" (bundled) and "specified version" (downloaded from npm) modes.

4. **`AuthProvider`**: Acquires tokens for PAT or OIDC/Entra ID flows. Returns a simple `{ authType, token, serviceUrl }` object that the arg builder consumes.

---

## 3. Repository Structure

```
/
├── packages/
│   ├── core/                          # @extension-tasks/core — platform-agnostic
│   │   ├── src/
│   │   │   ├── index.ts               # Public API barrel
│   │   │   ├── platform.ts            # IPlatformAdapter interface
│   │   │   ├── tfx-manager.ts         # Install/resolve/execute tfx
│   │   │   ├── auth.ts                # AuthCredentials type, AuthProvider interface
│   │   │   ├── arg-builder.ts         # Fluent TFX argument construction
│   │   │   ├── json-output-stream.ts  # Parse tfx JSON output from mixed stdout
│   │   │   ├── vsix-editor.ts         # Patch existing VSIX packages
│   │   │   ├── version-utils.ts       # Version parsing, incrementing, task patching
│   │   │   ├── manifest-utils.ts      # Read/write/patch manifests, resolve task paths
│   │   │   ├── commands/
│   │   │   │   ├── types.ts           # Shared command option/result types
│   │   │   │   ├── package.ts         # tfx extension create
│   │   │   │   ├── publish.ts         # tfx extension publish
│   │   │   │   ├── share.ts           # tfx extension share
│   │   │   │   ├── unshare.ts         # tfx extension unshare
│   │   │   │   ├── install.ts         # tfx extension install
│   │   │   │   ├── show.ts            # tfx extension show
│   │   │   │   ├── is-valid.ts        # tfx extension isvalid (with retry)
│   │   │   │   └── unpublish.ts       # tfx extension unpublish
│   │   │   └── __tests__/
│   │   │       ├── tfx-manager.test.ts
│   │   │       ├── arg-builder.test.ts
│   │   │       ├── json-output-stream.test.ts
│   │   │       ├── vsix-editor.test.ts
│   │   │       ├── version-utils.test.ts
│   │   │       ├── manifest-utils.test.ts
│   │   │       ├── commands/
│   │   │       │   ├── package.test.ts
│   │   │       │   ├── publish.test.ts
│   │   │       │   ├── share.test.ts
│   │   │       │   ├── unshare.test.ts
│   │   │       │   ├── install.test.ts
│   │   │       │   ├── show.test.ts
│   │   │       │   ├── is-valid.test.ts
│   │   │       │   ├── unpublish.test.ts
│   │   │       │   └── verify-install.test.ts
│   │   │       └── helpers/
│   │   │           ├── mock-platform.ts   # Full mock IPlatformAdapter
│   │   │           └── fixtures/          # Sample manifests, VSIX files
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── azdo-task/                     # Azure Pipelines task v6
│   │   ├── src/
│   │   │   ├── main.ts                # Entry point
│   │   │   ├── azdo-adapter.ts        # IPlatformAdapter → azure-pipelines-task-lib
│   │   │   ├── azdo-auth.ts           # AzureRM OIDC + PAT via service endpoints
│   │   │   └── __tests__/
│   │   │       ├── azdo-adapter.test.ts
│   │   │       └── azdo-auth.test.ts
│   │   ├── task.json
│   │   ├── icon.png
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── github-action/                 # GitHub Action
│       ├── src/
│       │   ├── main.ts                # Entry point
│       │   ├── github-adapter.ts      # IPlatformAdapter → @actions/core + exec
│       │   ├── github-auth.ts         # OIDC token via @actions/core
│       │   └── __tests__/
│       │       ├── github-adapter.test.ts
│       │       └── github-auth.test.ts
│       ├── action.yml
│       ├── package.json
│       └── tsconfig.json
│
├── vss-extension.json                 # Extension manifest (v6, single task)
├── package.json                       # Root workspace config
├── tsconfig.base.json                 # Shared TS config
├── jest.config.ts                     # Test configuration (Jest + ts-jest)
├── rollup.config.ts                   # Bundle configuration (Rollup)
├── eslint.config.mjs                  # ESLint flat config
├── .prettierrc.yml                    # Prettier configuration
├── .prettierignore                    # Prettier ignore patterns
├── .node-version                      # Pin Node.js version (24.x)
├── azure-pipelines.yml                # CI/CD for Azure DevOps extension
├── AGENT.md                           # Instructions for Copilot Coding Agent
├── .devcontainer/
│   └── devcontainer.json              # Dev container configuration
├── .vscode/
│   ├── settings.json                  # Workspace settings (format on save, etc.)
│   └── extensions.json                # Recommended VS Code extensions
├── .github/
│   ├── copilot-instructions.md        # Copilot chat instructions
│   ├── prompts/                       # Reusable Copilot prompt files
│   │   └── review.prompt.md
│   └── workflows/
│       ├── ci.yml                     # GitHub Actions CI (test action on runners)
│       ├── unit-tests.yml             # Unit tests on all runners × Node versions
│       ├── check-dist.yml             # Verify dist/ is up-to-date
│       ├── linter.yml                 # ESLint + Prettier checks
│       └── copilot-setup-steps.yml    # Copilot Coding Agent setup
├── Metadata/
│   ├── overview.md
│   └── Images/
└── plan.md                            # This file
```

### Workspace Management

Use **npm workspaces** (not Lerna/Nx) for simplicity:

```jsonc
// root package.json
{
  "workspaces": ["packages/core", "packages/azdo-task", "packages/github-action"],
}
```

---

## 4. Phase 1 — Core Library (`packages/core/extension-tasks-core`)

### 4.1 `IPlatformAdapter` Interface

```typescript
// packages/core/src/platform.ts

export enum TaskResult {
  Succeeded = 0,
  Failed = 1,
  Warning = 2,
}

export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  silent?: boolean;
  ignoreReturnCode?: boolean;
  outStream?: NodeJS.WritableStream;
  errStream?: NodeJS.WritableStream;
  failOnStdErr?: boolean;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface IPlatformAdapter {
  // Input
  getInput(name: string, required?: boolean): string | undefined;
  getBoolInput(name: string, required?: boolean): boolean;
  getDelimitedInput(name: string, delimiter: string, required?: boolean): string[];

  // Output
  setOutput(name: string, value: string): void;
  setResult(result: TaskResult, message: string): void;
  setVariable(name: string, value: string, isSecret?: boolean, isOutput?: boolean): void;
  setSecret(value: string): void;

  // Logging
  debug(message: string): void;
  info(message: string): void;
  warning(message: string): void;
  error(message: string): void;

  // Execution
  which(tool: string, check?: boolean): Promise<string>;
  exec(tool: string, args: string[], options?: ExecOptions): Promise<number>;

  // Filesystem (subset needed by core)
  findMatch(root: string, patterns: string[]): string[];
  fileExists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  mkdirP(path: string): Promise<void>;
  rmRF(path: string): Promise<void>;

  // Environment
  getVariable(name: string): string | undefined;
  getTempDir(): string;

  // Tool management
  cacheDir(sourceDir: string, tool: string, version: string): Promise<string>;
  findCachedTool(tool: string, version: string): string | undefined;
  downloadTool(url: string): Promise<string>;
}
```

### 4.2 `AuthProvider` Interface

```typescript
// packages/core/src/auth.ts

export interface AuthCredentials {
  authType: 'pat' | 'basic';
  serviceUrl: string;
  token?: string;
  username?: string;
  password?: string;
}

export interface IAuthProvider {
  /**
   * Resolve credentials from platform-specific configuration.
   * Implementations handle PAT endpoints, OIDC/Entra flows, etc.
   */
  getCredentials(): Promise<AuthCredentials>;
}
```

The core library does NOT implement auth providers — each platform adapter provides its own. The core only consumes `AuthCredentials` to build tfx args.

### 4.3 `TfxManager`

Responsible for:

1. **Embedded mode** (`version: "embedded"`): Locate the bundled tfx binary shipped with the extension/action
2. **Specified version** (`version: "<semver>"`): Download from npm, cache, and locate
3. **Execution**: Run tfx with args, capture output, parse JSON
4. **Reuse across invocations**: When the task/action is used multiple times in the same job/workflow, a previously resolved tfx binary must be reused — never re-installed

```typescript
// packages/core/src/tfx-manager.ts

export interface TfxManagerOptions {
  version: string; // "embedded" | semver spec (e.g. "0.17.x", "latest")
  platform: IPlatformAdapter;
}

export class TfxManager {
  private resolvedPath?: string;

  constructor(options: TfxManagerOptions);

  /**
   * Ensure tfx is available and return the executable path.
   * Uses a cache-first strategy:
   *   1. In-memory (same process invocation)
   *   2. Platform tool cache (persists across steps in the same job)
   *   3. Install from npm and cache
   *
   * This guarantees that when the task/action is invoked multiple
   * times in the same pipeline job or GitHub Actions workflow job,
   * a custom tfx version is installed only once.
   */
  async resolve(): Promise<string>;

  /** Execute tfx with given args, return parsed result */
  async execute(args: string[], options?: TfxExecOptions): Promise<TfxResult>;
}

export interface TfxResult {
  exitCode: number;
  json?: unknown; // Parsed JSON from stdout (if --json was used)
  stdout: string;
  stderr: string;
}
```

#### Resolve flow (cache-first, install-once)

```
resolve()
  ├─ if this.resolvedPath → return immediately (same process reuse)
  ├─ if version === "embedded"
  │    └─ locate bundled tfx relative to __dirname → cache & return
  ├─ platform.findCachedTool("tfx-cli", version)
  │    └─ if found → set resolvedPath, return (cross-step reuse)
  └─ not cached:
       ├─ npm pack tfx-cli@<version> into temp dir
       ├─ extract tarball
       ├─ platform.cacheDir(extractedDir, "tfx-cli", resolvedVersion)
       ├─ On Windows: prefer tfx.cmd; delete bare tfx shim
       └─ set resolvedPath, return
```

**Key reuse guarantees**:

- **Azure Pipelines**: `azure-pipelines-tool-lib` stores cached tools in `$AGENT_TOOLSDIRECTORY`, which persists for the lifetime of the agent job. Multiple task invocations within the same job share this cache.
- **GitHub Actions**: `@actions/tool-cache` stores in `$RUNNER_TOOL_CACHE`, persisted across all steps in a job. Additionally, the cache can be persisted across workflow runs using `actions/cache`.
- **Same step / composite**: The in-memory `resolvedPath` field shortcuts repeat calls within the same Node process.
- The resolved version string is normalized (e.g. `"0.17.x"` → `"0.17.3"`) so cache lookups are deterministic.

### 4.4 `ArgBuilder`

Fluent builder that constructs the tfx CLI argument array:

```typescript
// packages/core/src/arg-builder.ts

export class ArgBuilder {
  private args: string[] = [];

  arg(values: string | string[]): this;
  argIf(condition: unknown, values: string | string[]): this;
  flag(name: string): this;
  flagIf(condition: unknown, name: string): this;
  option(name: string, value: string | undefined): this;
  optionIf(condition: unknown, name: string, value: string | undefined): this;

  /** Append raw string (split on spaces, like tfx.line()) */
  line(raw: string): this;

  build(): string[];
}
```

### 4.5 `JsonOutputStream`

Rewrite of the existing `TfxJsonOutputStream` as a platform-agnostic `Transform` stream:

```typescript
export class JsonOutputStream extends stream.Transform {
  jsonString: string;
  messages: string[];
  constructor(lineWriter: (msg: string) => void);
}
```

### 4.6 Command Functions

Each command is a standalone async function:

```typescript
// packages/core/src/commands/package.ts

export interface PackageOptions {
  // Manifest source
  rootFolder?: string;
  manifestGlobs?: string[];
  manifestJs?: string;
  manifestJsEnv?: string[];
  localizationRoot?: string;
  json5?: boolean;

  // Overrides
  publisherId?: string;
  extensionId?: string;
  extensionName?: string;
  extensionVersion?: string;
  extensionVisibility?: string;
  extensionPricing?: string;
  displayName?: string;
  description?: string;
  baseUri?: string; // Issue #39
  overrideJson?: string; // Raw JSON override string
  overridesFile?: string;

  // Task patching
  updateTasksVersion?: boolean;
  updateTasksVersionType?: 'major' | 'minor' | 'patch';
  updateTasksId?: boolean;

  // Behavior
  outputPath?: string;
  revVersion?: boolean;
  bypassValidation?: boolean;
  extraArgs?: string;
}

export interface PackageResult {
  vsixPath: string;
  extensionId: string;
  extensionVersion: string;
  publisherId: string;
}

export async function packageExtension(
  options: PackageOptions,
  auth: AuthCredentials | null, // null for local-only packaging
  tfx: TfxManager,
  platform: IPlatformAdapter
): Promise<PackageResult>;
```

Similar typed interfaces for every other command. See [§12 Consolidated Input Schema](#12-consolidated-input-schema) for the full breakdown.

### 4.7 `verifyInstall` Command

The `verifyInstall` command uses the **Azure DevOps REST API** (via `azure-devops-node-api`) to poll an organization and confirm that an extension's contributed pipeline tasks are actually available to agents. This addresses a common pain point where `install` succeeds but tasks are not yet usable.

**Pattern** (inspired by [`jessehouwing/azure-pipelines-dependency-submission`](https://github.com/jessehouwing/azure-pipelines-dependency-submission)):

```typescript
// packages/core/src/commands/verify-install.ts

import { WebApi, getPersonalAccessTokenHandler } from 'azure-devops-node-api';
import type { ITaskAgentApi } from 'azure-devops-node-api/TaskAgentApi.js';

export interface VerifyInstallOptions {
  publisherId: string;
  extensionId: string;
  accounts: string[]; // Target org URLs
  expectedTaskNames?: string[]; // If known; otherwise derived from extension manifest
  timeoutMinutes?: number; // Default: 5
  pollingIntervalSeconds?: number; // Default: 10
}

export interface InstalledTask {
  taskName: string;
  taskVersion: string;
  isBuiltIn: boolean; // Contributed by agent vs extension
}

export interface VerifyInstallResult {
  allTasksAvailable: boolean;
  availableTasks: InstalledTask[];
  missingTasks: string[];
  accountResults: Map<string, { available: boolean; tasks: InstalledTask[] }>;
}

export async function verifyInstall(
  options: VerifyInstallOptions,
  auth: AuthCredentials,
  platform: IPlatformAdapter
): Promise<VerifyInstallResult> {
  const fullExtensionId = options.extensionId;

  for (const accountUrl of options.accounts) {
    const handler = getPersonalAccessTokenHandler(auth.token!);
    const connection = new WebApi(accountUrl, handler);
    const taskAgentApi: ITaskAgentApi = await connection.getTaskAgentApi();

    // Poll until tasks appear or timeout
    const deadline = Date.now() + (options.timeoutMinutes ?? 5) * 60_000;
    while (Date.now() < deadline) {
      const taskDefinitions = await taskAgentApi.getTaskDefinitions();
      const installedTasks = new Map<string, InstalledTask>();

      for (const task of taskDefinitions) {
        const key = task.name!;
        const isBuiltIn = !task.contributionIdentifier;
        installedTasks.set(key, {
          taskName: key,
          taskVersion: `${task.version?.major}.${task.version?.minor}.${task.version?.patch}`,
          isBuiltIn,
        });
      }

      // Check if expected tasks from the extension are present
      const extensionTasks = taskDefinitions.filter((t) =>
        t.contributionIdentifier?.startsWith(`${options.publisherId}.${fullExtensionId}.`)
      );

      if (extensionTasks.length > 0) {
        platform.info(
          `Found ${extensionTasks.length} task(s) from ${options.publisherId}.${fullExtensionId}`
        );
        break;
      }

      platform.info(
        `Tasks not yet available, polling again in ${options.pollingIntervalSeconds ?? 10}s...`
      );
      await new Promise((r) => setTimeout(r, (options.pollingIntervalSeconds ?? 10) * 1000));
    }
  }
  // ... return aggregated results
}
```

**Key details**:

- Uses `azure-devops-node-api` `WebApi` + `getTaskDefinitions()` from `ITaskAgentApi`
- Tasks contributed by extensions have a `contributionIdentifier` matching `{publisher}.{extensionId}.{taskName}`
- Built-in (agent-shipped) tasks have no `contributionIdentifier`
- Polls with configurable interval and timeout; fails the task if timeout is exceeded
- Works with both PAT and OIDC tokens (passed through `AuthCredentials`)
- The `azure-devops-node-api` package is added as a dependency to `packages/core`

### 4.8 `VsixEditor` (rewrite)

See [Phase 4](#7-phase-4--vsix-editor-rewrite) for details.

### 4.9 `VersionUtils`

```typescript
export function parseVersion(str: string): {
  major: number;
  minor: number;
  patch: number;
  revision?: number;
};
export function incrementVersion(version: string, type: 'major' | 'minor' | 'patch'): string;
export function updateTaskVersion(
  manifest: unknown,
  extensionVersion: string,
  versionType: string
): unknown;
export function generateTaskId(publisher: string, extensionId: string, taskName: string): string; // UUID v5
```

### 4.10 `ManifestUtils`

```typescript
export function resolveManifestPaths(
  rootFolder: string,
  patterns: string[],
  platform: IPlatformAdapter
): string[];
export function readManifest(path: string, platform: IPlatformAdapter): Promise<unknown>;
export function writeManifest(
  manifest: unknown,
  path: string,
  platform: IPlatformAdapter
): Promise<void>;

// Issue #188: Honor package path mappings when resolving task manifests
export function resolveTaskManifestPaths(
  extensionManifest: unknown,
  extensionManifestPath: string,
  platform: IPlatformAdapter
): string[];

// Issue #172: Update internal contribution references when extension ID changes
export function updateContributionReferences(
  manifest: unknown,
  originalExtensionId: string,
  newExtensionId: string
): unknown;
```

---

## 5. Phase 2 — Azure Pipelines Task

### 5.1 `task.json` Design

Single task with `command` picklist as the primary selector. Inputs show/hide via `visibleRule`.

```jsonc
{
  "id": "<new-guid-for-v6>",
  "name": "TfxExtension",
  "friendlyName": "Manage Azure DevOps Extension (tfx)",
  "description": "Package, publish, share, install, query, and validate Azure DevOps extensions",
  "category": "Deploy",
  "author": "Microsoft Corporation",
  "version": { "Major": 6, "Minor": 0, "Patch": 0 },
  "minimumAgentVersion": "3.232.1",
  "demands": ["npm"],
  "instanceNameFormat": "tfx extension $(command)",
  "groups": [
    { "name": "connection", "displayName": "Service Connection" },
    { "name": "extension", "displayName": "Extension Identity" },
    {
      "name": "manifest",
      "displayName": "Manifest",
      "isExpanded": true,
      "visibleRule": "command = package || command = publish",
    },
    { "name": "overrides", "displayName": "Overrides", "isExpanded": false },
    {
      "name": "sharing",
      "displayName": "Sharing",
      "isExpanded": false,
      "visibleRule": "command = publish || command = share || command = unshare",
    },
    {
      "name": "install",
      "displayName": "Installation",
      "isExpanded": false,
      "visibleRule": "command = install",
    },
    {
      "name": "validation",
      "displayName": "Validation",
      "isExpanded": false,
      "visibleRule": "command = publish || command = isValid",
    },
    {
      "name": "versioning",
      "displayName": "Versioning",
      "isExpanded": false,
      "visibleRule": "command = show",
    },
    { "name": "tfx", "displayName": "tfx Configuration", "isExpanded": false },
    { "name": "advanced", "displayName": "Advanced", "isExpanded": false },
  ],
  "inputs": [
    /* See §12 */
  ],
  "execution": {
    "Node24": {
      "target": "dist/main.js",
    },
    "Node20_1": {
      "target": "dist/main.js",
    },
  },
}
```

### 5.2 `AzdoAdapter` — `IPlatformAdapter` for Azure Pipelines

Maps to `azure-pipelines-task-lib` and `azure-pipelines-tool-lib`:

```typescript
// packages/azdo-task/src/azdo-adapter.ts
import tl from 'azure-pipelines-task-lib/task.js';
import * as toolLib from 'azure-pipelines-tool-lib/tool.js';

export class AzdoPlatformAdapter implements IPlatformAdapter {
  getInput(name, required) {
    return tl.getInput(name, required) ?? undefined;
  }
  getBoolInput(name, required) {
    return tl.getBoolInput(name, required);
  }
  // ... etc.
  exec(tool, args, options) {
    /* use tl.tool(tool).arg(args).execAsync(options) */
  }
  which(tool) {
    return Promise.resolve(tl.which(tool, true));
  }
  cacheDir(dir, tool, ver) {
    return toolLib.cacheDir(dir, tool, ver);
  }
  findCachedTool(tool, ver) {
    return toolLib.findLocalTool(tool, ver) || undefined;
  }
  // ...
}
```

### 5.3 `AzdoAuthProvider`

```typescript
// packages/azdo-task/src/azdo-auth.ts
import tl from 'azure-pipelines-task-lib/task.js';
import { AzureRMEndpoint } from 'azure-pipelines-tasks-azure-arm-rest/azure-arm-endpoint.js';

export class AzdoPATAuthProvider implements IAuthProvider {
  async getCredentials(): Promise<AuthCredentials> {
    const endpoint = tl.getInput('connectedServiceName', true);
    const url = tl.getEndpointUrl(endpoint, false);
    const auth = tl.getEndpointAuthorization(endpoint, false);
    const token = auth.parameters['password'] || auth.parameters['apitoken'];
    tl.setSecret(token);
    return { authType: 'pat', serviceUrl: url, token };
  }
}

export class AzdoOIDCAuthProvider implements IAuthProvider {
  async getCredentials(): Promise<AuthCredentials> {
    const serviceName = tl.getInput('connectedServiceNameAzureRM', true);
    const endpoint = await new AzureRMEndpoint(serviceName).getEndpoint();
    endpoint.applicationTokenCredentials.activeDirectoryResourceId =
      '499b84ac-1321-427f-aa17-267ca6975798'; // VS Marketplace scope
    const token = await endpoint.applicationTokenCredentials.getToken();
    tl.setSecret(token);
    return {
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token,
    };
  }
}

export class AzdoTFSAuthProvider implements IAuthProvider {
  async getCredentials(): Promise<AuthCredentials> {
    const endpoint = tl.getInput('connectedServiceNameTFS', true);
    const url = tl.getEndpointUrl(endpoint, false);
    const auth = tl.getEndpointAuthorization(endpoint, false);
    if (auth.parameters['username']) {
      tl.setSecret(auth.parameters['password']);
      return {
        authType: 'basic',
        serviceUrl: url,
        username: auth.parameters['username'],
        password: auth.parameters['password'],
      };
    }
    const token = auth.parameters['apitoken'];
    tl.setSecret(token);
    return { authType: 'pat', serviceUrl: url, token };
  }
}
```

### 5.4 Entry Point (`main.ts`)

```typescript
import { AzdoPlatformAdapter } from './azdo-adapter.js';
import { AzdoPATAuthProvider, AzdoOIDCAuthProvider, AzdoTFSAuthProvider } from './azdo-auth.js';
import { run } from '@extension-tasks/core';

const platform = new AzdoPlatformAdapter();
const command = platform.getInput('command', true);
const connectTo = platform.getInput('connectTo', true);

// Select auth provider
let auth: IAuthProvider | null = null;
if (command !== 'package') {
  switch (connectTo) {
    case 'VsTeam':
      auth = new AzdoPATAuthProvider();
      break;
    case 'AzureRM':
      auth = new AzdoOIDCAuthProvider();
      break;
    case 'TFS':
      auth = new AzdoTFSAuthProvider();
      break;
  }
}

await run(command, auth, platform);
```

---

## 6. Phase 3 — GitHub Actions Implementation

### 6.1 `action.yml`

```yaml
name: 'Azure DevOps Extension Tasks'
description: 'Package, publish, share, install, query, and validate Azure DevOps extensions'
branding:
  icon: 'package'
  color: 'blue'

inputs:
  command:
    description: 'Command to run: package, publish, unpublish, share, unshare, install, show, isValid, verifyInstall'
    required: true
  connectTo:
    description: 'Authentication method: PAT or OIDC'
    required: false
    default: 'OIDC'
  serviceUrl:
    description: 'Marketplace or Azure DevOps Server URL'
    required: false
    default: 'https://marketplace.visualstudio.com'
  token:
    description: 'PAT token (when connectTo=PAT)'
    required: false
  azureClientId:
    description: 'Entra ID app registration client ID (when connectTo=OIDC)'
    required: false
  azureTenantId:
    description: 'Entra ID tenant ID (when connectTo=OIDC)'
    required: false
  # ... all other inputs matching the core options ...
  tfxVersion:
    description: "tfx-cli version to use ('embedded' for bundled)"
    required: false
    default: 'embedded'

outputs:
  extensionOutputPath:
    description: 'Path to the packaged/published VSIX file'
  extensionVersion:
    description: 'Extension version (from show command)'

runs:
  using: 'node24'
  main: 'dist/index.js'
```

### 6.2 `GitHubAdapter` — `IPlatformAdapter` for GitHub Actions

```typescript
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as glob from '@actions/glob';

export class GitHubPlatformAdapter implements IPlatformAdapter {
  getInput(name, required) {
    return core.getInput(name, { required }) || undefined;
  }
  getBoolInput(name, required) {
    return core.getBooleanInput(name, { required });
  }
  setOutput(name, value) {
    core.setOutput(name, value);
  }
  setResult(result, message) {
    if (result !== TaskResult.Succeeded) core.setFailed(message);
  }
  setSecret(value) {
    core.setSecret(value);
  }
  debug(message) {
    core.debug(message);
  }
  info(message) {
    core.info(message);
  }
  warning(message) {
    core.warning(message);
  }
  error(message) {
    core.error(message);
  }
  exec(tool, args, options) {
    return exec.exec(tool, args, options);
  }
  which(tool, check) {
    return io.which(tool, check);
  }
  cacheDir(dir, tool, ver) {
    return tc.cacheDir(dir, tool, ver);
  }
  findCachedTool(tool, ver) {
    return tc.find(tool, ver) || undefined;
  }
  downloadTool(url) {
    return tc.downloadTool(url);
  }
  // ...
}
```

### 6.3 GitHub Auth

```typescript
export class GitHubPATAuthProvider implements IAuthProvider {
  constructor(
    private token: string,
    private serviceUrl: string
  ) {}
  async getCredentials() {
    return { authType: 'pat' as const, serviceUrl: this.serviceUrl, token: this.token };
  }
}

export class GitHubOIDCAuthProvider implements IAuthProvider {
  /**
   * Acquire an access token for the VS Marketplace via GitHub OIDC → Entra ID
   * federated credential exchange.
   *
   * Flow:
   * 1. Request a GitHub OIDC token with audience set to the Entra ID
   *    application's client ID (configured by the user as an input).
   * 2. Exchange the OIDC token for an Entra ID access token using the
   *    OAuth 2.0 client credentials grant with federated credential.
   * 3. The access token targets the VS Marketplace resource
   *    (499b84ac-1321-427f-aa17-267ca6975798/.default).
   *
   * Prerequisites (documented in README):
   * - An Entra ID app registration with a federated credential trusting
   *   the GitHub OIDC provider for the repo/environment.
   * - The app must have the "Marketplace > Manage" permission or be
   *   authorized as a publisher member.
   * - Inputs: `azureClientId`, `azureTenantId` (from the app registration).
   */
  async getCredentials() {
    const clientId = core.getInput('azureClientId', { required: true });
    const tenantId = core.getInput('azureTenantId', { required: true });

    // Step 1: Get GitHub OIDC token with the Entra app as audience
    const idToken = await core.getIDToken(clientId);

    // Step 2: Exchange for Entra ID access token targeting VS Marketplace
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: idToken,
      scope: '499b84ac-1321-427f-aa17-267ca6975798/.default',
    });

    const resp = await fetch(tokenUrl, { method: 'POST', body });
    if (!resp.ok) {
      throw new Error(`Entra token exchange failed: ${resp.status} ${await resp.text()}`);
    }
    const { access_token } = (await resp.json()) as { access_token: string };
    core.setSecret(access_token);

    return {
      authType: 'pat' as const,
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: access_token,
    };
  }
}
```

---

## 7. Phase 4 — VSIX Editor Rewrite

### Goals

- Remove dependency on `7zip-bin` (large native binary)
- Use pure JS zip library (`yazl`/`yauzl` or `archiver`/`unzipper`) — much smaller
- Make platform-agnostic (current impl has Windows/Linux branching for 7zip vs unzip)
- Fix issue #205: Derive extension ID from VSIX manifest when not supplied
- Fix issue #172: Update internal contribution references when extension tag modifies ID

### New Design

```typescript
// packages/core/src/vsix-editor.ts

import { createReadStream } from 'node:fs';
import { Open as unzipper } from 'unzipper';
import yazl from 'yazl';

export interface VsixEditOptions {
  publisher?: string;
  extensionId?: string;
  extensionName?: string;
  extensionVersion?: string;
  extensionVisibility?: string;
  extensionPricing?: string;
  updateTasksVersion?: boolean;
  updateTasksVersionType?: string;
  updateTasksId?: boolean;
  updateContributionReferences?: boolean; // Issue #172
}

export class VsixEditor {
  constructor(
    private vsixPath: string,
    private outputDir: string,
    private platform: IPlatformAdapter
  ) {}

  /**
   * Read, patch, and re-package a VSIX file.
   * Returns the path to the new VSIX.
   */
  async edit(options: VsixEditOptions): Promise<string> {
    // 1. Open VSIX with yauzl/unzipper
    // 2. Extract and parse extension.vsixmanifest (XML)
    // 3. Derive extensionId from VSIX if not supplied (fix #205)
    // 4. Apply identity changes (publisher, id+tag, version, name)
    // 5. Update gallery flags (visibility, pricing)
    // 6. If updateTasksId/Version: extract task.json files, patch, re-add
    // 7. Update contribution references if tag changed ID (fix #172)
    // 8. Create new VSIX with yazl, streaming unmodified entries from original
    // 9. Return output path
  }
}
```

### Key Improvements

- **Single pass**: Read original zip, stream entries to new zip, replacing only modified files
- **No temp extraction to disk**: Parse XML/JSON in memory, only write the final output VSIX
- **Fix #205**: Always read publisher+extensionId from the VSIX's `extension.vsixmanifest` as fallback
- **Fix #172**: After modifying extensionId (with tag), scan all contribution properties for `{publisher}.{originalId}.*` patterns and replace with `{publisher}.{newId}.*`
- **Fix #188**: Use the `files` array with `packagePath` mappings to resolve task manifest locations within the VSIX

---

## 8. Phase 5 — Testing Strategy

### Framework

- **Jest** with **ts-jest** — Mature, widely supported, excellent mocking primitives
- ESM mode via `NODE_OPTIONS=--experimental-vm-modules` and `ts-jest` with `useESM: true`
- **Test structure**: Co-located `__tests__/` directories within each package

#### Jest Configuration

```typescript
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Strip .js from ESM imports for resolution
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.base.json',
      },
    ],
  },
  resolver: 'ts-jest-resolver',
  collectCoverageFrom: ['./packages/*/src/**/*.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/'],
  testMatch: ['**/__tests__/**/*.test.ts'],
};

export default config;
```

### Test Categories

#### 8.1 Core Unit Tests

Every module in `packages/core/src/` gets a corresponding test file. Tests use the **mock platform adapter** — no real IO, no real exec.

| Module                       | Test Focus                                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `arg-builder.test.ts`        | Fluent API produces correct arg arrays; `argIf` skips falsy; `line()` splits correctly                                                 |
| `json-output-stream.test.ts` | Separates JSON from warnings/commands; handles chunked input; handles empty/invalid JSON                                               |
| `version-utils.test.ts`      | Parsing `##.##.##`, `##.##.##.##`; increment major/minor/patch; invalid input errors; UUID v5 generation for task IDs is deterministic |
| `manifest-utils.test.ts`     | Read/write round-trip; BOM stripping; task path resolution with `packagePath` mapping (#188); contribution reference updates (#172)    |
| `vsix-editor.test.ts`        | Use fixture VSIX files; verify identity patching; gallery flag manipulation; task version/ID patching; output file naming              |

#### 8.2 Command Unit Tests

Each command test mocks `TfxManager.execute()` and verifies:

1. Correct tfx args are built for various input combinations
2. JSON output is parsed correctly
3. Output variables are set
4. Error handling (nonzero exit, invalid JSON, missing required inputs)
5. Retry behavior (for `isValid` command)
6. Multi-target iteration (for `install` command)
7. VSIX editor integration (for `publish` with vsix + overrides)

#### 8.3 Platform Adapter Tests

- `azdo-adapter.test.ts`: Verify each method delegates to the correct `azure-pipelines-task-lib` call (use `jest.mock()` on `tl`)
- `github-adapter.test.ts`: Verify delegations to `@actions/core`, `@actions/exec`, etc.
- `azdo-auth.test.ts`: Mock service endpoint data, verify correct `AuthCredentials` are produced per `connectTo` value
- `github-auth.test.ts`: Mock `core.getIDToken()`, verify OIDC flow

#### 8.4 Integration Tests (optional, CI-only)

- **TfxManager integration**: Actually install tfx from npm, verify binary is found
- **VSIX round-trip**: Package a sample extension, edit the VSIX, verify contents with yauzl
- These run in a separate CI job with longer timeout

### Mock Platform Adapter

```typescript
// packages/core/src/__tests__/helpers/mock-platform.ts

export class MockPlatformAdapter implements IPlatformAdapter {
  inputs: Record<string, string> = {};
  outputs: Record<string, string> = {};
  variables: Record<string, string> = {};
  secrets: string[] = [];
  logs: { level: string; message: string }[] = [];
  execCalls: { tool: string; args: string[]; options?: ExecOptions }[] = [];
  execResults: Map<string, { exitCode: number; stdout: string; stderr: string }> = new Map();
  files: Map<string, string> = new Map();
  result?: { status: TaskResult; message: string };

  // Set up inputs for a test
  withInputs(inputs: Record<string, string>): this { ... }
  // Set up exec mock results
  withExecResult(tool: string, result: ExecResult): this { ... }
  // Assert helpers
  assertOutputSet(name: string, expectedValue?: string): void { ... }
  assertResultFailed(messageContains?: string): void { ... }
  assertExecCalledWith(tool: string, argsContaining: string[]): void { ... }
}
```

### Test Coverage Target

| Area              | Target                |
| ----------------- | --------------------- |
| Core library      | ≥ 90% line coverage   |
| Command functions | ≥ 95% branch coverage |
| Platform adapters | ≥ 80% line coverage   |
| Auth providers    | ≥ 85% line coverage   |
| Overall           | ≥ 90% line coverage   |

---

## 9. Phase 6 — Build, Bundle & Size Optimization

### Build Toolchain

| Tool               | Purpose                                  |
| ------------------ | ---------------------------------------- |
| **TypeScript 6**   | Compile to ESNext with strict mode       |
| **Rollup**         | Bundle each entry point to a single file |
| **npm workspaces** | Monorepo dependency management           |
| **ESLint**         | Linting (flat config)                    |
| **Prettier**       | Code formatting                          |

### Bundle Strategy

Each consumer (azdo-task, github-action) produces a **single bundled JS file** via Rollup:

```typescript
// rollup.config.ts
import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig([
  // Azure Pipelines task
  {
    input: 'packages/azdo-task/src/main.ts',
    output: {
      file: 'packages/azdo-task/dist/main.js',
      format: 'es',
      sourcemap: true,
    },
    external: [
      // Provided by the agent runtime — must NOT be bundled
      /^azure-pipelines-task-lib/,
      /^azure-pipelines-tool-lib/,
      /^azure-pipelines-tasks-azure-arm-rest/,
    ],
    plugins: [
      typescript({ tsconfig: 'packages/azdo-task/tsconfig.json' }),
      nodeResolve({ preferBuiltins: true }),
      commonjs(),
    ],
  },
  // GitHub Action
  {
    input: 'packages/github-action/src/main.ts',
    output: {
      file: 'packages/github-action/dist/index.js',
      format: 'es',
      sourcemap: true,
    },
    // Bundle everything into one file for GitHub Actions
    plugins: [
      typescript({ tsconfig: 'packages/github-action/tsconfig.json' }),
      nodeResolve({ preferBuiltins: true }),
      commonjs(),
    ],
  },
]);
```

### Size Reduction Strategies

1. **Replace 7zip-bin with yauzl/yazl** — Removes ~5MB of native binaries
2. **Replace x2js with fast-xml-parser** — Smaller, maintained, pure JS
3. **Bundle + tree-shake** — Dead code elimination removes unused tfx-cli internals
4. **Single output JS per consumer** — No `node_modules` folder to ship (for GitHub Action)
5. **Azure Pipelines task** — Still needs `node_modules` for task-lib etc., but Rollup bundles core + commands into one file, dramatically reducing file count
6. **Strip source maps, .d.ts, README, LICENSE from dependencies** — Continue pipeline cleanup from current CI

### Expected Size Comparison

| Component                 | Current (est.) | Target    |
| ------------------------- | -------------- | --------- |
| All tasks combined (VSIX) | ~40-60 MB      | ~10-15 MB |
| Single task node_modules  | varies         | < 5 MB    |
| GitHub Action dist/       | N/A            | < 2 MB    |

### ESLint Configuration

Flat config (ESLint 9+) with TypeScript, Jest, and Prettier integration:

```javascript
// eslint.config.mjs
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import jest from 'eslint-plugin-jest';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    plugins: { import: importPlugin },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'import/order': ['error', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
      'import/no-duplicates': 'error',
    },
  },
  {
    files: ['**/__tests__/**/*.ts'],
    ...jest.configs['flat/recommended'],
  },
  prettier // Must be last — disables formatting rules handled by Prettier
);
```

### Prettier Configuration

```yaml
# .prettierrc.yml
semi: false
singleQuote: true
trailingComma: none
tabWidth: 2
printWidth: 120
endOfLine: lf
```

```
# .prettierignore
dist/
*.vsix
node_modules/
packages/*/dist/
coverage/
```

### npm Scripts

```jsonc
// root package.json scripts
{
  "scripts": {
    "build": "tsc --build",
    "bundle": "rollup -c rollup.config.ts --configPlugin typescript",
    "test": "NODE_OPTIONS=--experimental-vm-modules jest",
    "test:coverage": "NODE_OPTIONS=--experimental-vm-modules jest --coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check-dist": "npm run bundle && git diff --exit-code packages/*/dist/",
    "package": "tfx extension create --root . --output-path dist --manifest-globs vss-extension.json",
  },
}
```

---

## 10. Phase 7 — CI/CD Pipeline

### 10.1 GitHub Actions Workflows

#### `.github/workflows/ci.yml` — Action Integration Tests

Tests the GitHub Action on all supported hosted runners:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24' }
      - run: npm ci
      - run: npm run build
      - run: npm run test:coverage
      - run: npm run bundle

  test-action:
    needs: build
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24' }
      - run: npm ci
      - run: npm run bundle
      - name: Test package command
        uses: ./
        with:
          command: package
          rootFolder: test/fixtures/sample-extension
          outputPath: ${{ runner.temp }}/test.vsix
      # Additional integration tests per command...
```

#### `.github/workflows/unit-tests.yml` — Cross-Platform Unit Tests

```yaml
name: Unit Tests
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24' }
      - run: npm ci
      - run: npm run build
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.os }}
          path: coverage/
```

#### `.github/workflows/check-dist.yml` — Verify Bundled Output

Ensures `dist/` is committed and up-to-date (pattern from `jessehouwing/actions-dependency-submission`):

```yaml
name: Check dist
on:
  push:
    branches: [main]
  pull_request:

jobs:
  check-dist:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24' }
      - run: npm ci
      - run: npm run bundle
      - name: Compare expected vs actual dist/
        id: diff
        run: |
          if [ "$(git diff --ignore-space-at-eol --text packages/*/dist/ | wc -l)" -gt 0 ]; then
            echo "Detected uncommitted changes after bundle. Run 'npm run bundle' and commit."
            git diff --text packages/*/dist/
            exit 1
          fi
```

#### `.github/workflows/linter.yml` — ESLint + Prettier

```yaml
name: Lint
on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24' }
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
```

#### `.github/workflows/copilot-setup-steps.yml` — Copilot Coding Agent

```yaml
name: Copilot Setup Steps
on: workflow_dispatch

jobs:
  copilot-setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24' }
      - run: npm ci
      - run: npm run build
      - run: npm run test
```

### 10.2 Azure Pipelines Workflows

#### `azure-pipelines.yml` — Extension Build, Test & Publish

```yaml
trigger:
  branches:
    include: [main]
pr:
  branches:
    include: [main]

stages:
  - stage: Build
    jobs:
      - job: BuildAndTest
        strategy:
          matrix:
            linux_node24:
              vmImage: 'ubuntu-latest'
              nodeVersion: '24.x'
            linux_node20:
              vmImage: 'ubuntu-latest'
              nodeVersion: '20.x'
            windows_node24:
              vmImage: 'windows-latest'
              nodeVersion: '24.x'
            windows_node20:
              vmImage: 'windows-latest'
              nodeVersion: '20.x'
            macos_node24:
              vmImage: 'macos-latest'
              nodeVersion: '24.x'
        pool:
          vmImage: $(vmImage)
        steps:
          - task: NodeTool@0
            inputs: { versionSpec: '$(nodeVersion)' }
          - script: npm ci
          - script: npm run build
          - script: npm run test:coverage
          - script: npm run lint
          - script: npm run format:check

      - job: Bundle
        dependsOn: BuildAndTest
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: NodeTool@0
            inputs: { versionSpec: '24.x' }
          - script: npm ci
          - script: npm run build
          - script: npm run bundle
          - script: npm run package
          - publish: $(Build.ArtifactStagingDirectory)
            artifact: vsix

  - stage: PublishDev
    condition: and(succeeded(), ne(variables['Build.Reason'], 'PullRequest'))
    jobs:
      - deployment: DeployDev
        environment: dev
        strategy:
          runOnce:
            deploy:
              steps:
                -  # Publish private extension to marketplace

  - stage: PublishProd
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployProd
        environment: production
        strategy:
          runOnce:
            deploy:
              steps:
                -  # Publish public extension + GitHub release
```

#### Azure Pipelines Integration Tests (separate pipeline)

Tests the packaged Azure DevOps task on all hosted agent images:

```yaml
# azure-pipelines-integration.yml
trigger: none # Run manually or after PublishDev

strategy:
  matrix:
    ubuntu_node24:
      vmImage: 'ubuntu-latest'
      nodeVersion: '24.x'
    ubuntu_node20:
      vmImage: 'ubuntu-latest'
      nodeVersion: '20.x'
    windows_node24:
      vmImage: 'windows-latest'
      nodeVersion: '24.x'
    windows_node20:
      vmImage: 'windows-latest'
      nodeVersion: '20.x'
    macos_node24:
      vmImage: 'macos-latest'
      nodeVersion: '24.x'

pool:
  vmImage: $(vmImage)

steps:
  - task: NodeTool@0
    inputs: { versionSpec: '$(nodeVersion)' }
  - task: TfxExtension@6
    displayName: 'Test: package'
    inputs:
      command: package
      rootFolder: test/fixtures/sample-extension
      outputPath: $(Build.ArtifactStagingDirectory)/test.vsix
  # Additional integration test steps per command...
```

---

## 11. Phase 8 — Migration & Documentation

### `vss-extension.json` Changes

- **Remove** all 10 existing task contributions
- **Add** single new task contribution (`TfxExtension` v6)
- **Keep** service endpoint type definitions (`VstsMarketplacePublishing`, `TFSMarketplacePublishing`)
- **Remove** `PublishVSExtension` and `IsValidExtension` (server task)
- **Bump** extension version to 6.0.0

### Migration Guide (in README or `docs/migration-v6.md`)

Document:

1. Task name change: `PackageAzureDevOpsExtension@5` → `TfxExtension@6` with `command: package`
2. Input name mappings (e.g. `fileType` → `extensionSource`, `method` → `extensionSource`)
3. Removed tasks and alternatives
4. New inputs (`manifestJs`, `json5`, `baseUri`, `tfxVersion`, etc.)
5. Breaking changes in output variable names

### Update `copilot-instructions.md`

Rewrite to reflect new single-package architecture, workspace layout, test commands, and contribution patterns.

### DevContainer Configuration

```jsonc
// .devcontainer/devcontainer.json
{
  "name": "Azure DevOps Extension Tasks",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:24",
  "features": {
    "ghcr.io/devcontainers/features/github-cli:1": {},
  },
  "postCreateCommand": "npm ci",
  "customizations": {
    "vscode": {
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "[typescript]": {
          "editor.defaultFormatter": "esbenp.prettier-vscode",
          "editor.codeActionsOnSave": {
            "source.fixAll.eslint": "explicit",
            "source.organizeImports": "explicit",
          },
        },
        "jest.autoRun": "off",
        "typescript.tsdk": "node_modules/typescript/lib",
      },
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "orta.vscode-jest",
        "ms-azuretools.vscode-docker",
        "GitHub.copilot",
        "GitHub.copilot-chat",
        "GitHub.vscode-pull-request-github",
        "eamodio.gitlens",
        "EditorConfig.EditorConfig",
        "ms-vscode.vscode-typescript-next",
      ],
    },
  },
}
```

### VS Code Workspace Settings

```jsonc
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "jest.autoRun": "off",
  "eslint.useFlatConfig": true,
  "search.exclude": {
    "**/dist": true,
    "**/*.vsix": true,
  },
}
```

### AGENT.md — Copilot Coding Agent Instructions

This file lives at the repo root and is automatically read by Copilot Coding Agent (GitHub Copilot workspace agent, Copilot CLI, etc.):

```markdown
# AGENT.md

## Repository Overview

npm workspace monorepo with 3 packages:

- `packages/core` — Platform-agnostic extension task business logic
- `packages/azdo-task` — Azure Pipelines task adapter
- `packages/github-action` — GitHub Actions adapter

## Quick Start

\`\`\`bash
npm ci # Install all dependencies
npm run build # TypeScript compile all packages
npm run test # Run Jest tests
npm run test:coverage # Run tests with coverage
npm run bundle # Rollup bundle for each consumer
npm run lint # ESLint check
npm run format:check # Prettier check
\`\`\`

## Key Commands

| Command            | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `npm run build`    | TypeScript compile (all packages via project references) |
| `npm run test`     | Jest unit tests (ESM mode)                               |
| `npm run bundle`   | Rollup bundle for azdo-task and github-action            |
| `npm run lint:fix` | Auto-fix ESLint issues                                   |
| `npm run format`   | Auto-format with Prettier                                |
| `npm run package`  | Create .vsix extension package                           |

## Architecture

- All business logic is in `packages/core/src/commands/`
- Platform adapters implement `IPlatformAdapter` interface
- Tests use `MockPlatformAdapter` from `packages/core/src/__tests__/helpers/`
- Each command is a standalone async function — no class hierarchies

## Contributing

1. Make changes in `packages/core/src/` for business logic
2. Run `npm run test` to verify
3. Run `npm run lint:fix && npm run format` to format
4. Run `npm run bundle` if you changed code that affects dist/
5. Commit both source and dist/ changes
```

### `.node-version`

```
24
```

Pin the default Node.js version for tools like `nvm`, `fnm`, `mise`, `nodenv`, and CI setup actions.

---

## 12. Consolidated Input Schema

### Global Inputs (all commands)

| Input                         | Type             | Default    | Required            | Description                                                                                          |
| ----------------------------- | ---------------- | ---------- | ------------------- | ---------------------------------------------------------------------------------------------------- |
| `command`                     | picklist         | —          | ✅                  | `package`, `publish`, `unpublish`, `share`, `unshare`, `install`, `show`, `isValid`, `verifyInstall` |
| `connectTo`                   | radio            | `AzureRM`  | ✅ (except package) | `VsTeam`, `AzureRM`, `TFS`                                                                           |
| `connectedServiceName`        | connectedService | —          | When VsTeam         | PAT endpoint                                                                                         |
| `connectedServiceNameAzureRM` | connectedService | —          | When AzureRM        | WIF/OIDC endpoint                                                                                    |
| `connectedServiceNameTFS`     | connectedService | —          | When TFS            | TFS endpoint                                                                                         |
| `tfxVersion`                  | string           | `embedded` | No                  | `embedded` or semver spec                                                                            |
| `cwd`                         | filePath         | —          | No                  | Working directory                                                                                    |
| `arguments`                   | string           | —          | No                  | Additional raw tfx args                                                                              |

### Extension Identity Inputs (most commands)

| Input             | Type                        | Visible When         | Description                     |
| ----------------- | --------------------------- | -------------------- | ------------------------------- |
| `extensionSource` | radio (`manifest` / `vsix`) | package, publish     | How the extension is identified |
| `publisherId`     | string                      | —                    | Publisher ID                    |
| `extensionId`     | string                      | —                    | Extension ID                    |
| `vsixFile`        | filePath                    | extensionSource=vsix | VSIX file path (supports globs) |

### Manifest Inputs (package, publish)

| Input              | Type      | Default              | Visible When             | Description                                  |
| ------------------ | --------- | -------------------- | ------------------------ | -------------------------------------------- |
| `rootFolder`       | filePath  | —                    | extensionSource=manifest | Root folder                                  |
| `manifestGlobs`    | multiLine | `vss-extension.json` | extensionSource=manifest | Manifest file patterns                       |
| `manifestJs`       | filePath  | —                    | extensionSource=manifest | JS manifest generator file (new)             |
| `manifestJsEnv`    | multiLine | —                    | manifestJs specified     | Env vars for manifest-js (`key=value`) (new) |
| `json5`            | boolean   | false                | extensionSource=manifest | Enable JSON5 support (new)                   |
| `localizationRoot` | filePath  | —                    | extensionSource=manifest | Localization root                            |
| `outputPath`       | filePath  | —                    | —                        | VSIX output path                             |

### Override Inputs (package, publish)

| Input                    | Type     | Default   | Description                                                       |
| ------------------------ | -------- | --------- | ----------------------------------------------------------------- |
| `extensionName`          | string   | —         | Override display name                                             |
| `displayName`            | string   | —         | Override display name (new, tfx flag)                             |
| `description`            | string   | —         | Override description (new, tfx flag)                              |
| `extensionVersion`       | string   | —         | Override version (`##.##.##(.##)`)                                |
| `extensionVisibility`    | picklist | `default` | `default`, `private`, `privatepreview`, `publicpreview`, `public` |
| `extensionPricing`       | picklist | `default` | `default`, `free`, `paid`                                         |
| `baseUri`                | string   | —         | Override baseUri for dev (issue #39) (new)                        |
| `overrideJson`           | string   | —         | Raw JSON override string (new)                                    |
| `overridesFile`          | filePath | —         | JSON overrides file path (new)                                    |
| `updateTasksVersion`     | boolean  | false     | Update task versions from extension version                       |
| `updateTasksVersionType` | picklist | `major`   | `major`, `minor`, `patch`                                         |
| `updateTasksId`          | boolean  | false     | Generate deterministic task IDs                                   |
| `revVersion`             | boolean  | false     | Auto-increment patch and save to manifest (new)                   |

### Sharing Inputs (publish, share, unshare)

| Input         | Type   | Description                                     |
| ------------- | ------ | ----------------------------------------------- |
| `shareWith`   | string | Comma-separated org names to share with         |
| `unshareWith` | string | Comma-separated org names to unshare from (new) |

### Install Inputs

| Input                     | Type    | Description                                          |
| ------------------------- | ------- | ---------------------------------------------------- |
| `accounts`                | string  | Comma-separated org URLs to install to               |
| `waitForTaskAvailability` | boolean | Poll until tasks are available (#189) (new)          |
| `taskAvailabilityTimeout` | string  | Max wait time in minutes for task availability (new) |

### Verify Install Inputs (verifyInstall)

| Input                     | Type      | Default | Description                                       |
| ------------------------- | --------- | ------- | ------------------------------------------------- |
| `accounts`                | string    | —       | Azure DevOps org URL to check (single account)    |
| `publisherId`             | string    | —       | Publisher to look up                              |
| `extensionId`             | string    | —       | Extension to look up                              |
| `taskNames`               | multiLine | —       | Task names to verify are installed (one per line) |
| `taskAvailabilityTimeout` | string    | `10`    | Max wait time in minutes                          |
| `pollInterval`            | string    | `30`    | Seconds between polls                             |

Uses `azure-devops-node-api` (`TaskAgentApi.getTaskDefinitions()`) to poll Azure DevOps for task availability. Based on the pattern from [jessehouwing/azure-pipelines-dependency-submission](https://github.com/jessehouwing/azure-pipelines-dependency-submission).

### Validation Inputs (publish, isValid)

| Input              | Type    | Default | Description                             |
| ------------------ | ------- | ------- | --------------------------------------- |
| `noWaitValidation` | boolean | false   | Skip waiting for marketplace validation |
| `bypassValidation` | boolean | false   | Bypass local validation                 |
| `bypassScopeCheck` | boolean | false   | Bypass scope check (new)                |
| `maxRetries`       | string  | `10`    | Max validation poll retries (isValid)   |
| `minTimeout`       | string  | `1`     | Minutes between retries (isValid)       |
| `extensionVersion` | string  | —       | Specific version to validate (isValid)  |

### Version Query Inputs (show)

| Input                      | Type     | Default                     | Description                                 |
| -------------------------- | -------- | --------------------------- | ------------------------------------------- |
| `versionAction`            | picklist | `None`                      | `None`, `Patch`, `Minor`, `Major`           |
| `setBuildNumber`           | boolean  | false                       | Update pipeline build number                |
| `extensionVersionOverride` | string   | `Extension.VersionOverride` | Variable name to check for version override |

### Output Variables

| Command       | Variable               | Description                                 |
| ------------- | ---------------------- | ------------------------------------------- |
| package       | `Extension.OutputPath` | Path to generated VSIX                      |
| publish       | `Extension.OutputPath` | Path to published VSIX                      |
| show          | `Extension.Version`    | Queried/incremented version                 |
| verifyInstall | `Tasks.Available`      | `true` if all specified tasks are available |

---

## 13. Command-to-Input Mapping

Matrix showing which inputs each command uses:

| Input                    | package | publish | unpublish | share | unshare | install | show | isValid | verifyInstall |
| ------------------------ | ------- | ------- | --------- | ----- | ------- | ------- | ---- | ------- | ------------- |
| connectTo                | —       | ✅      | ✅        | ✅    | ✅      | ✅      | ✅   | ✅      | ✅            |
| extensionSource          | ✅      | ✅      | ✅        | ✅    | ✅      | ✅      | —    | ✅      | —             |
| publisherId              | ✅      | ✅      | ✅        | ✅    | ✅      | ✅      | ✅   | ✅      | ✅            |
| extensionId              | ✅      | ✅      | ✅        | ✅    | ✅      | ✅      | ✅   | ✅      | ✅            |
| connectTo                | —       | ✅      | ✅        | ✅    | ✅      | ✅      | ✅   | ✅      |
| extensionSource          | ✅      | ✅      | ✅        | ✅    | ✅      | ✅      | —    | ✅      |
| publisherId              | ✅      | ✅      | ✅        | ✅    | ✅      | ✅      | ✅   | ✅      |
| extensionId              | ✅      | ✅      | ✅        | ✅    | ✅      | ✅      | ✅   | ✅      |
| vsixFile                 | ✅¹     | ✅¹     | ✅¹       | ✅¹   | ✅¹     | ✅¹     | —    | ✅¹     | —             |
| rootFolder               | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| manifestGlobs            | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| manifestJs               | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| manifestJsEnv            | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| json5                    | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| localizationRoot         | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| outputPath               | ✅      | —       | —         | —     | —       | —       | —    | —       | —             |
| extensionName            | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| displayName              | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| description              | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| extensionVersion         | ✅      | ✅      | —         | —     | —       | —       | —    | ✅²     | —             |
| extensionVisibility      | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| extensionPricing         | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| baseUri                  | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| overrideJson             | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| overridesFile            | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| updateTasksVersion       | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| updateTasksVersionType   | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| updateTasksId            | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| revVersion               | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| shareWith                | —       | ✅      | —         | ✅    | —       | —       | —    | —       | —             |
| unshareWith              | —       | —       | —         | —     | ✅      | —       | —    | —       | —             |
| accounts                 | —       | —       | —         | —     | —       | ✅      | —    | —       | ✅            |
| waitForTaskAvailability  | —       | —       | —         | —     | —       | ✅      | —    | —       | —             |
| taskNames                | —       | —       | —         | —     | —       | —       | —    | —       | ✅            |
| taskAvailabilityTimeout  | —       | —       | —         | —     | —       | ✅      | —    | —       | ✅            |
| pollInterval             | —       | —       | —         | —     | —       | —       | —    | —       | ✅            |
| noWaitValidation         | —       | ✅      | —         | —     | —       | —       | —    | —       | —             |
| bypassValidation         | ✅      | ✅      | —         | —     | —       | —       | —    | —       | —             |
| bypassScopeCheck         | —       | ✅      | —         | —     | —       | —       | —    | —       | —             |
| maxRetries               | —       | —       | —         | —     | —       | —       | —    | ✅      | —             |
| minTimeout               | —       | —       | —         | —     | —       | —       | —    | ✅      | —             |
| versionAction            | —       | —       | —         | —     | —       | —       | ✅   | —       | —             |
| setBuildNumber           | —       | —       | —         | —     | —       | —       | ✅   | —       | —             |
| extensionVersionOverride | —       | —       | —         | —     | —       | —       | ✅   | —       | —             |

¹ When `extensionSource = vsix`
² Version to validate against in `isValid`

---

## 14. Issue Resolutions

### Issue #205 — `updateTasksId` doesn't work with VSIX-only publish

**Root cause**: When publishing from a VSIX file without specifying `extensionId`, the code tries to read the extension ID from a manifest file that doesn't exist.

**Fix in new architecture**: `VsixEditor.edit()` always reads the VSIX's `extension.vsixmanifest` to extract `Identity._Id` and `Identity._Publisher`. These become the fallback values when `extensionId`/`publisherId` inputs are not provided. The `generateTaskId()` function then uses the correct values.

**Location**: `packages/core/src/vsix-editor.ts` → `deriveIdentityFromVsix()` method.

### Issue #189 — Poll for task availability after install

**Fix**: Add `waitForTaskAvailability` boolean input to the install command. After successful `tfx extension install`, if enabled:

1. Extract task IDs from the extension metadata (via `tfx extension show --json`)
2. Poll `tfx build tasks list --json` (or use the Azure DevOps REST API via `azure-devops-node-api`) at each target account
3. Check if all expected task IDs appear in the list
4. Retry with configurable backoff and timeout (`taskAvailabilityTimeout` input)

**Location**: `packages/core/src/commands/install.ts` → `waitForTasks()` helper.

### Issue #39 — Add `baseUri` override

**Fix**: Add `baseUri` input. When specified:

- In manifest mode: Add to JSON overrides as `{ "baseUri": "<value>" }`
- In VSIX mode: Patch via VsixEditor (add manifest property override)
- Also expose as `--override '{"baseUri":"<value>"}'` to tfx

**Location**: `packages/core/src/commands/package.ts` and `publish.ts` — amend overrides object.

### Issue #188 — `updateTasksId` doesn't honor `packagePath` mappings

**Root cause**: `getTaskManifestPaths()` assumes task.json lives at `<rootFolder>/<taskName>/task.json` based on contribution name, but the `files` array in `vss-extension.json` can map `path` → `packagePath` (e.g., `.dist/MyTask` → `MyTask`).

**Fix**: In `resolveTaskManifestPaths()`, cross-reference the `files` array to resolve actual disk paths. For each task contribution name, check if a `files` entry with matching `packagePath` exists and use its `path` property instead.

**Location**: `packages/core/src/manifest-utils.ts` → `resolveTaskManifestPaths()`.

### Issue #172 — Extension tags break internal contribution references

**Root cause**: When extension IDs are changed to variant IDs (for example `myext` → `myext-dev`), internal references like `"featureId": "pub.myext.feature"` are not updated.

**Fix**: After modifying the extension ID, scan ALL string values in the manifest for patterns matching `{publisher}.{originalExtensionId}.` and replace with `{publisher}.{newExtensionId}.`. Apply the same fix in VsixEditor for VSIX-based publishing.

**Location**: `packages/core/src/manifest-utils.ts` → `updateContributionReferences()`.

---

## 15. Risk Register

| #   | Risk                                                                                | Impact | Mitigation                                                                                                        |
| --- | ----------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Breaking change confuses existing users                                             | High   | Comprehensive migration guide; keep v5 extension published; use new task name + v6 major                          |
| 2   | yauzl/yazl VSIX editing misses edge cases (encoding, large files, symlinks)         | Medium | Extensive VSIX round-trip integration tests; test with real marketplace extensions                                |
| 3   | GitHub Actions OIDC requires Entra ID app registration + federated credential setup | Medium | Document prerequisites in README with step-by-step guide; provide integration test; validate token exchange in CI |
| 4   | tfx-cli npm API changes between versions                                            | Low    | Pin embedded version; version override allows user control                                                        |
| 5   | Rollup bundling breaks dynamic requires in dependencies                             | Medium | Mark problematic deps as external; test bundled output end-to-end                                                 |
| 6   | azure-pipelines-tool-lib API changes                                                | Low    | Pin version; minimal surface area used                                                                            |
| 7   | `unshare` is new and untested in current tasks                                      | Low    | Unit test thoroughly; it's a simple tfx passthrough                                                               |
| 8   | Contribution reference update (#172) may have false positives                       | Medium | Use precise pattern: `{publisher}.{extensionId}.` prefix only; add opt-out flag                                   |

---

## 16. Resolved Questions

All open questions have been answered. Decisions are recorded below for traceability.

1. **Task GUID**: ~~New GUID or keep existing?~~ **Decision**: Use a **new GUID**. This is a fundamentally different task; a clean break avoids confusion.

2. **Embedded tfx version**: ~~Latest at build time, or pinned?~~ **Decision**: **Pin in `package.json`** as an explicit dependency. Use the latest version available at the time of initial implementation; update deliberately thereafter via Dependabot / manual PR.

3. **GitHub Action OIDC**: ~~May not work as-is; PAT-only fallback?~~ **Decision**: OIDC **must** work. PAT-only is not acceptable for a production GitHub Action. Implementation uses a **GitHub OIDC → Entra ID federated credential → VS Marketplace access token** exchange (see §6.3 `GitHubOIDCAuthProvider`). Users provide `azureClientId` and `azureTenantId` inputs. Prerequisites are documented in the README.

4. **`unshare` command**: ~~Separate command or flag on share?~~ **Decision**: **Separate command** for clarity.

5. **Server gate task**: ~~Alternative for IsValidExtension release gate?~~ **Decision**:
   - **Azure Pipelines**: Copy the existing agent-based `IsValidExtension` task implementation as-is into the new `isValid` command. It can be used in a gate job with the Agentless/Server gate replaced by an agent-based gate job with polling.
   - **GitHub Actions**: No native gate mechanism exists. The recommended pattern is:
     - Use a [GitHub Environment](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment) with `wait-timer` and `required-reviewers` protection rules.
     - Add the `isValid` command as a step in the deployment job. If validation fails, the step fails and the job retries per the environment's deployment protection rules.
     - For purely automated polling, use a separate workflow job that calls `isValid` with `maxRetries` and gates the downstream deployment job via `needs:`.

6. **Node version support**: **Decision**: Azure Pipelines task targets **Node 24** (primary, `Node24` execution handler) and **Node 20** (fallback, `Node20_1` execution handler). GitHub Action targets **Node 24** only (`runs.using: node24`). Pin `.node-version` to `24`.

7. **`azure-devops-node-api`**: **Decision**: **Yes** — use `azure-devops-node-api` for task availability polling (`verifyInstall` command and `waitForTaskAvailability` in `install`). More reliable than parsing tfx CLI output, and it's a maintained Microsoft package.

---

## Implementation Order

| Phase  | Description                                                                                                                                    | Dependencies  | Est. Effort |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------- |
| **0**  | Repo scaffold: npm workspaces, TypeScript 6, ESLint, Prettier, Jest, Rollup, DevContainer, AGENT.md, .node-version, CI workflows (empty stubs) | None          | 1-2 days    |
| **1**  | Core library scaffold + `IPlatformAdapter` + `ArgBuilder` + `JsonOutputStream` + `VersionUtils`                                                | Phase 0       | 2-3 days    |
| **2a** | Command implementations (package, publish, unpublish, share, unshare)                                                                          | Phase 1       | 3-4 days    |
| **2b** | Command implementations (install, show, isValid)                                                                                               | Phase 1       | 2-3 days    |
| **2c** | `verifyInstall` command (`azure-devops-node-api` polling)                                                                                      | Phase 1       | 1-2 days    |
| **3**  | VSIX Editor rewrite (yauzl/yazl, fixes #205, #172, #188)                                                                                       | Phase 1       | 3-4 days    |
| **3a** | Issue-specific fixes (#39 baseUri, #189 task polling)                                                                                          | Phase 2, 5    | 1-2 days    |
| **4**  | TfxManager (embedded + download modes)                                                                                                         | Phase 1       | 1-2 days    |
| **5**  | Azure Pipelines adapter + auth + task.json (Node 24 + Node 20) + main.ts                                                                       | Phase 2, 3, 4 | 2-3 days    |
| **6**  | GitHub Actions adapter + auth + action.yml (Node 24) + main.ts                                                                                 | Phase 2, 3, 4 | 2-3 days    |
| **7**  | Unit tests (all modules) — Jest + ts-jest ESM                                                                                                  | Phase 1-6     | 4-5 days    |
| **8**  | Build + Rollup bundling + check-dist workflow + size optimization                                                                              | Phase 5, 6    | 1-2 days    |
| **9**  | CI/CD: GitHub Actions workflows (ci, unit-tests, check-dist, linter, copilot-setup-steps)                                                      | Phase 8       | 1-2 days    |
| **10** | CI/CD: Azure Pipelines (build matrix × agents × Node versions, integration tests)                                                              | Phase 8       | 1-2 days    |
| **11** | Integration tests on all hosted runners/agents (ubuntu, windows, macos) × Node versions                                                        | All           | 2-3 days    |
| **12** | Documentation (migration guide, README, copilot-instructions, AGENT.md)                                                                        | All           | 1-2 days    |

**Total estimated effort: 28-40 days**
