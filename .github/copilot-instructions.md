# AI Coding Agent Instructions - V6 Architecture

Purpose: Help agents quickly contribute to Azure DevOps Extension Tasks v6 (unified Azure Pipelines task + GitHub Actions for Azure/VS Marketplace operations).

## Big Picture - V6 Architecture

### Repository Structure

```
packages/
├── core/                 # Shared business logic
│   ├── src/
│   │   ├── commands/     # 9 commands (package, publish, install, etc.)
│   │   ├── manifest-*    # Manifest Reader→Editor→Writer architecture
│   │   ├── vsix-*        # VSIX reading/writing
│   │   ├── auth/         # Authentication providers
│   │   ├── tfx-manager.ts # tfx-cli lifecycle management
│   │   └── validation.ts  # Input validation
│   └── dist/             # Compiled output
├── azdo-task/            # Azure Pipelines Task adapter
│   ├── src/main.ts       # Entry point, routes to core commands
│   └── dist/             # Bundled for Azure Pipelines
├── azdo-server-task/     # Azure Pipelines Server Task (validation gate)
│   └── task.json         # Server task definition (no code, runs on server)
└── github-action/        # GitHub Actions adapter
    ├── src/main.ts       # Entry point, routes to core commands
    └── dist/             # Bundled for GitHub Actions
```

### V6 Key Concepts

1. **Unified Core**: Single codebase for Azure Pipelines and GitHub Actions
2. **Platform Adapters**: Thin wrappers (main.ts) that translate platform inputs/outputs
3. **Manifest Architecture**: Reader→Editor→Writer pattern for all manifest operations
4. **Bundling**: esbuild bundles to single JS files (azdo-task/dist, github-action/dist)
5. **TypeScript ES Modules**: All code uses ES modules with `.js` extensions in imports

## Development Workflow

### Setup

```bash
npm install              # Install root dependencies
npm run build            # Build all packages
npm run test             # Run all tests
npm run lint             # Lint all packages
```

### Building

```bash
npm run build            # Build all packages
npm run bundle           # Bundle for distribution
```

### Testing

```bash
npm test                 # Run all tests
npm run test:coverage    # Run tests with coverage
```

## Platform Adapters Pattern

### Azure Pipelines Adapter (packages/azdo-task/src/main.ts)

```typescript
import { AzdoAdapter } from '@packages/core';

async function run(): Promise<void> {
  const adapter = new AzdoAdapter();

  // Validate inputs at entry point
  await adapter.validateInputs();

  // Route to appropriate command
  const operation = adapter.getInput('operation', true);
  await adapter.routeToCommand(operation);
}

run();
```

**Key Points:**

- Uses `azure-pipelines-task-lib` for all platform interactions
- Input names match task.json definitions
- Outputs set via `tl.setVariable(name, value, false, true)`
- Task results via `tl.setResult(TaskResult, message)`

### GitHub Actions Adapter (packages/github-action/src/main.ts)

```typescript
import { GitHubAdapter } from '@packages/core';

async function run(): Promise<void> {
  const adapter = new GitHubAdapter();

  // Validate inputs at entry point
  await adapter.validateInputs();

  // Route to appropriate command
  const operation = adapter.getInput('operation', true);
  await adapter.routeToCommand(operation);
}

run();
```

**Key Points:**

- Uses `@actions/core` for all platform interactions
- Input names match action.yml definitions
- Outputs set via `core.setOutput(name, value)`
- Secrets marked via `core.setSecret(value)`

### Platform Adapter Interface (IPlatformAdapter)

All platform-specific operations go through this interface:

```typescript
interface IPlatformAdapter {
  // Input/Output
  getInput(name: string, required?: boolean): string;
  getBoolInput(name: string): boolean;
  setOutput(name: string, value: string): void;
  setSecret(value: string): void;

  // File system
  which(tool: string): Promise<string>;
  resolvePath(...paths: string[]): string;

  // Execution
  exec(command: string, args: string[]): Promise<number>;

  // Logging
  debug(message: string): void;
  info(message: string): void;
  warning(message: string): void;
  error(message: string): void;

  // Tool caching
  cacheDir(sourceDir: string, tool: string, version: string): Promise<string>;
  findCache(toolName: string, version: string): string | undefined;
}
```

## Manifest Handling Architecture

### Three-Layer Pattern

#### 1. ManifestReader (Abstract Base)

Provides common interface for reading manifests from different sources.

**Implementations:**

- `FilesystemManifestReader` - reads from directories
- `VsixReader` - reads from VSIX ZIP archives

**Key Methods:**

```typescript
abstract class ManifestReader {
  abstract readExtensionManifest(): Promise<ExtensionManifest>;
  abstract readTaskManifest(taskPath: string): Promise<TaskManifest>;
  abstract readTaskManifests(): Promise<Map<string, TaskManifest>>;
  abstract findTaskPaths(): Promise<string[]>;
  getMetadata(): Promise<{ publisher: string; extensionId: string; version: string }>;
}
```

#### 2. ManifestEditor (Centralized Logic)

Source-agnostic editor working with any ManifestReader.

**Key Innovation - applyOptions() Method:**

```typescript
const editor = ManifestEditor.fromReader(reader);
await editor.applyOptions({
  publisherId: 'my-pub',
  extensionId: 'my-ext',
  extensionTag: 'preview', // Concatenates: my-ext-preview
  extensionVersion: '2.0.0',
  extensionName: 'My Extension',
  extensionVisibility: 'private',
  extensionPricing: 'free',
  updateTasksVersion: true,
  updateTasksVersionType: 'major', // major|minor|patch
  updateTasksId: true,
});
```

**All conditional logic is inside applyOptions():**

- Extension ID + tag concatenation
- Task version cascading (major → all, minor → Minor+Patch, patch → Patch only)
- Task UUID generation (deterministic UUID v5)
- Visibility/pricing enum mapping

#### 3. Writers

Write modified manifests to targets.

**FilesystemManifestWriter:**

- Updates task.json files on filesystem
- Generates overrides.json for tfx (`--overrides-file` flag)
- Supports packagePath for compiled task directories

**VsixWriter:**

- Updates manifests inside VSIX archive
- Optimized: only recompresses modified files

### Command Pattern (Package & Publish)

Both commands follow identical minimal pattern:

```typescript
// 1. Create reader
const reader = new FilesystemManifestReader({ rootFolder, manifestGlobs, platform });
// OR for VSIX mode:
// const reader = await VsixReader.open(vsixFile);

// 2. Apply all options (ALL logic here)
const editor = ManifestEditor.fromReader(reader);
await editor.applyOptions(options);

// 3. Write changes
const writer = await editor.toWriter();
await writer.writeToFilesystem(); // or writeToFile(vsixPath)

// 4. Get overrides for tfx (filesystem only)
const overridesPath = writer.getOverridesPath();

// 5. Cleanup
await writer.close();
await reader.close();
```

### packagePath Directory Prefix Mapping

Handles extensions where task sources are in different directories than package structure.

**Manifest configuration:**

```json
{
  "files": [{ "path": "compiled/cli", "packagePath": "CLI" }]
}
```

**How it works:**

- `CLI` → `compiled/cli`
- `CLI/v2` → `compiled/cli/v2`
- `CLI/v2/task.json` → `compiled/cli/v2/task.json`

**Important:** Requires path separator to prevent partial matches:

- ✅ `CLI/v2` matches
- ❌ `CLIOther` does NOT match

**Used by:**

- FilesystemManifestReader.readTaskManifest()
- FilesystemManifestWriter.writeTaskManifests()

## Authentication

### Supported Auth Methods

#### 1. PAT (Personal Access Token)

**Azure Pipelines:** Via service endpoint (VsTeam connection type)
**GitHub Actions:** Via `pat` input or GITHUB_TOKEN

```typescript
const authProvider = new PatAuthProvider(platform);
const credentials = await authProvider.getCredentials(endpoint);
// Returns: { username: string, password: string }
```

#### 2. Basic Authentication

**Azure Pipelines only:** Via service endpoint (TFS connection type)

```typescript
const authProvider = new BasicAuthProvider(platform);
const credentials = await authProvider.getCredentials(endpoint);
```

#### 3. Azure RM (Workload Identity Federation)

**Azure Pipelines:** Via AzureRM service connection with OIDC

```typescript
const authProvider = new AzureRmAuthProvider(platform);
const credentials = await authProvider.getCredentials(endpoint);
// Returns token for Azure DevOps marketplace scope
```

#### 4. GitHub OIDC

**GitHub Actions:** Via OIDC token exchange with Azure

```typescript
const authProvider = new GitHubOidcAuthProvider(platform);
const credentials = await authProvider.getCredentials();
// Returns token for Azure DevOps marketplace scope
```

**Critical Security Rule:**
All auth providers MUST call `platform.setSecret()` immediately after obtaining credentials:

```typescript
const token = await getToken();
platform.setSecret(token); // Mark as secret BEFORE any other operation
return { username, password: token };
```

## TFX Manager - tfx-cli Lifecycle

### Three Modes

#### 1. Built-in Mode (default)

Uses tfx-cli as direct dependency (bundled with extension).

```typescript
const tfxPath = await tfxManager.resolve('built-in');
// Finds tfx in node_modules/.bin/
```

#### 2. Path Mode

Uses tfx-cli from system PATH.

```typescript
const tfxPath = await tfxManager.resolve('path');
// Uses platform.which('tfx')
```

#### 3. Version Spec Mode

Downloads specific version from npm, caches it.

```typescript
const tfxPath = await tfxManager.resolve('^0.17.0');
// Resolves spec → exact version → npm install → cache
```

**Key Methods:**

```typescript
class TfxManager {
  async resolve(tfxVersion: string): Promise<string>;
  private async resolveBuiltIn(): Promise<string>;
  private async resolveFromPath(): Promise<string>;
  private async resolveVersionSpec(versionSpec: string): Promise<string>;
  private async downloadAndCache(exactVersion: string): Promise<string>;
}
```

**Caching:**
Uses platform tool cache (azure-pipelines-tool-lib or @actions/tool-cache).
Downloads full dependency tree (~211 packages) via `npm install`.

## Input Validation

### Validators (packages/core/src/validation.ts)

All validation happens at entry point before routing to commands.

```typescript
// Extension/Publisher IDs
validateExtensionId(id: string): void;     // Pattern: /^[a-zA-Z0-9._-]+$/
validatePublisherId(id: string): void;     // Pattern: /^[a-zA-Z0-9._-]+$/

// URLs
validateAccountUrl(url: string): void;     // HTTPS + Azure domains only

// Versions
validateVersion(version: string): void;    // Semantic versioning X.Y.Z

// Binary dependencies
validateNodeAvailable(): Promise<void>;
validateNpmAvailable(): Promise<void>;
validateTfxAvailable(): Promise<void>;
validateAzureCliAvailable(): Promise<void>;
```

**Usage in adapters:**

```typescript
// In main.ts entry point
await adapter.validateInputs(); // Calls appropriate validators
// If validation fails, throws Error and stops execution
```

## TypeScript Configuration

### Module System

**All packages use ES modules with Node16 resolution:**

```json
{
  "module": "Node16",
  "moduleResolution": "Node16",
  "target": "ES2022"
}
```

**CRITICAL: All imports MUST include .js extension:**

```typescript
// ✅ Correct
import { command } from './commands/package.js';
import * as tl from 'azure-pipelines-task-lib/task.js';

// ❌ Wrong - will fail at runtime
import { command } from './commands/package';
```

### Project References

All packages use TypeScript project references for faster builds:

```json
{
  "references": [{ "path": "../core" }]
}
```

### Strict Mode

```json
{
  "strict": true,
  "strictNullChecks": false // Only exception
}
```

## Bundling

### esbuild Configuration

Both adapters bundle to single JS files using esbuild (Scripts/bundle.mjs).

**External Dependencies:**

```javascript
external: [
  'azure-pipelines-task-lib', // Azure Pipelines only
  '@actions/core', // GitHub Actions only
  'tfx-cli', // Always external (not bundled)
];
```

**Platform-specific bundles:**

- `packages/azdo-task/dist/bundle.js` - Azure Pipelines bundle
- `packages/github-action/dist/bundle.js` - GitHub Actions bundle

**Build command:**

```bash
npm run bundle  # Builds both bundles
```

## Testing

### Test Structure

```
packages/core/src/__tests__/
├── unit/                          # Unit tests
│   ├── manifest-reader.test.ts
│   ├── manifest-editor.test.ts
│   └── ...
├── integration/                    # Integration tests
│   ├── tfx-execution.test.ts
│   └── end-to-end.test.ts
└── ...                            # Other test files
```

### Test Patterns

#### Mock Platform Adapter

```typescript
class MockPlatformAdapter implements IPlatformAdapter {
  inputs = new Map<string, string>();
  outputs = new Map<string, string>();
  secrets = new Set<string>();

  getInput(name: string): string {
    return this.inputs.get(name) || '';
  }

  setSecret(value: string): void {
    this.secrets.add(value);
  }
  // ... implement all methods
}
```

#### Testing Auth Providers

```typescript
test('should mask token immediately', async () => {
  const platform = new MockPlatformAdapter();
  const provider = new PatAuthProvider(platform);

  await provider.getCredentials(endpoint);

  // Verify secret was masked
  expect(platform.secrets.has(token)).toBe(true);
});
```

### Running Tests

```bash
npm test                    # All tests
npm run test:core           # Core library only
npm run test:integration    # Integration tests only
npm test -- --watch         # Watch mode
npm test -- --coverage      # Coverage report
```

## Commands Implementation

### All 9 Commands

1. **package** - Create VSIX from manifest files
2. **publish** - Publish extension (manifest or VSIX mode)
3. **install** - Install extension to org/collection
4. **share** - Share extension with org/collection
5. **unshare** - Unshare extension from org/collection
6. **unpublish** - Unpublish extension from marketplace
7. **show** - Query extension metadata
8. **isvalid** - Validate extension (name availability check)
9. **verify-install** - Verify extension is installed

### Command Pattern

All commands follow consistent pattern:

```typescript
export async function commandName(
  options: CommandOptions,
  platform: IPlatformAdapter
): Promise<CommandResult> {
  // 1. Validate inputs (if not done at entry point)

  // 2. Get tfx executable
  const tfxManager = new TfxManager(platform);
  const tfxPath = await tfxManager.resolve(options.tfxVersion);

  // 3. Build tfx arguments
  const args = ['command', 'subcommand'];
  if (options.someFlag) {
    args.push('--flag', options.someFlag);
  }

  // 4. Execute tfx
  const exitCode = await platform.exec(tfxPath, args);

  // 5. Parse output (if JSON output)
  const result = JSON.parse(output);

  // 6. Set outputs
  platform.setOutput('result', result.value);

  // 7. Return result
  return { success: exitCode === 0, data: result };
}
```

## Adding New Commands

1. **Create command file**: `packages/core/src/commands/my-command.ts`
2. **Implement command function** following pattern above
3. **Export from index**: Add to `packages/core/src/index.ts`
4. **Add to task.json**: Add operation option in `packages/azdo-task/task.json`
5. **Add to action.yml**: Add operation option in `packages/github-action/action.yml`
6. **Update routing**: Add case in adapter's `routeToCommand()` method
7. **Add tests**: Create `packages/core/src/__tests__/my-command.test.ts`
8. **Update documentation**: Add to README and command docs

## Common Patterns

### Error Handling

```typescript
try {
  await someOperation();
} catch (error) {
  platform.error(`Operation failed: ${error.message}`);
  throw error; // Let adapter handle setting task result
}
```

### Temp Files

```typescript
import { tmpdir } from 'os';
import { join } from 'path';

const tempFile = join(tmpdir(), `temp-${Date.now()}.json`);
try {
  await fs.writeFile(tempFile, data);
  // Use tempFile
} finally {
  await fs.unlink(tempFile); // Always cleanup
}
```

### File Globbing

```typescript
// Azure Pipelines
const files = tl.findMatch(rootDir, pattern);
if (files.length !== 1) {
  throw new Error(`Expected exactly 1 file, found ${files.length}`);
}

// GitHub Actions
const files = await glob.create(pattern).then((g) => g.glob());
```

## Conventions

### Naming

- **Classes**: PascalCase (`ManifestEditor`, `VsixReader`)
- **Functions**: camelCase (`readManifest`, `applyOptions`)
- **Constants**: UPPER_SNAKE_CASE (`MARKETPLACE_NAMESPACE`)
- **Interfaces**: PascalCase with 'I' prefix (`IPlatformAdapter`)
- **Types**: PascalCase (`ExtensionManifest`, `TaskManifest`)

### File Organization

- One class per file
- File name matches class name (kebab-case)
- Tests in `__tests__` directory
- Index files for public API

### Code Style

- Use `async`/`await` (not callbacks or raw promises)
- Prefer `const` over `let`, never `var`
- Use template literals for strings with variables
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Destructure parameters when practical
- Use early returns to reduce nesting

## Common Pitfalls

### Import Extensions

❌ **Wrong:** `import { X } from './file'`
✅ **Correct:** `import { X } from './file.js'`

### Platform-Specific Code

❌ **Wrong:** Direct use of `tl` or `core` in commands
✅ **Correct:** Use `IPlatformAdapter` interface

### Secret Handling

❌ **Wrong:** Log or output before masking
✅ **Correct:** Call `platform.setSecret()` immediately

### Resource Cleanup

❌ **Wrong:** Forget to close readers/writers
✅ **Correct:** Always use try/finally blocks

### Manifest Modifications

❌ **Wrong:** Direct file writes in commands
✅ **Correct:** Use ManifestEditor.applyOptions()

## CI/CD

### GitHub Actions Workflows

- `.github/workflows/ci.yml` - Main CI (build, test, lint)
- `.github/workflows/unit-tests.yml` - Unit tests only
- `.github/workflows/integration-tests.yml` - Integration tests
- `.github/workflows/lint.yml` - Linting
- `.github/workflows/check-dist.yml` - Verify bundles are up to date
- `.github/workflows/release.yml` - Release automation

### Azure Pipelines

- `azure-pipelines.yml` - Cross-platform build and test
  - Build stage: Windows 2022, Ubuntu Latest, macOS Latest
  - Test stage: Unit and integration tests
  - PublishDev/PublishProd stages: Disabled (condition: false)

## Documentation

### Key Documents

- `MANIFEST_ARCHITECTURE.md` - Manifest handling architecture
- `REFACTORING_SUMMARY.md` - V6 refactoring summary
- `GITHUB_ACTIONS_OIDC_GUIDE.md` - GitHub OIDC setup
- `OIDC_AUTHENTICATION.md` - OIDC auth implementation
- `CONTRIBUTING.md` - Development setup and workflows

### In-Code Documentation

- All public APIs have JSDoc comments
- Complex algorithms have inline comments
- task.json inputs have extensive helpMarkDown
- action.yml inputs have multi-line descriptions

## Performance Considerations

### VsixWriter Optimization

Only recompresses modified files. Unchanged entries copied directly.

### Manifest Caching

ManifestReader caches all read manifests in memory.

### Tool Caching

tfx-cli cached per version using platform tool cache.

### Bundling

Single-file bundles reduce startup time and deployment size.

## When Unsure

1. **Check existing commands** - Look at similar command implementations
2. **Review tests** - Test files show usage patterns
3. **Read architecture docs** - MANIFEST_ARCHITECTURE.md, REFACTORING_SUMMARY.md
4. **Use platform adapter** - Never use platform APIs directly
5. **Follow the patterns** - Reader→Editor→Writer for manifests
6. **Ask for clarification** - Better to ask than guess

## Quick Reference

### Build Commands

```bash
npm install        # Install dependencies
npm run build      # Build all packages
npm run bundle     # Create distribution bundles
npm test           # Run tests
npm run lint       # Lint code
```

### CRITICAL: End-of-Job Verification

**Before completing any coding session, ALWAYS run:**

```bash
npm run format          # Fix formatting issues
npm run lint:fix        # Fix linting issues
npm run test            # Verify all tests pass
npm run bundle          # Regenerate distribution bundles
```

This ensures code style consistency, no regressions, and bundle files stay in sync. CI will fail otherwise.

### Key Files

- `packages/core/src/commands/` - Command implementations
- `packages/core/src/manifest-*` - Manifest architecture
- `packages/azdo-task/src/main.ts` - Azure Pipelines entry
- `packages/github-action/src/main.ts` - GitHub Actions entry
- `packages/core/src/index.ts` - Public API exports

### Key Types

- `IPlatformAdapter` - Platform abstraction
- `ExtensionManifest` - vss-extension.json structure
- `TaskManifest` - task.json structure
- `CommandOptions` - Command input parameters
- `CommandResult` - Command return value

This document covers the v6 architecture. The v5 code has been removed.
