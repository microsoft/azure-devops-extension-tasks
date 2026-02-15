# AI Coding Agent Instructions

Purpose: Help agents quickly contribute to Azure DevOps Extension Tasks (publishing & packaging tasks for Azure/VS Marketplace).

## Big Picture
- This repo builds an Azure DevOps extension that contributes multiple pipeline tasks (see `vss-extension.json` > `contributions`). Each task lives under `BuildTasks/<TaskName>/` with a `task.json` (declarative metadata) and a TypeScript implementation file compiled to JS.
- Tasks wrap the `tfx-cli` to package/publish/share/install/query Azure DevOps & Visual Studio extensions. Common cross-cutting logic (auth, arg building, JSON stream parsing, version utilities) is centralized in `BuildTasks/Common/Common.ts`.
- Build flow: install dependencies locally per task folder, compile TS with project references, lint, then prune/dedupe before packaging the VSIX manifest.
- CI pipeline (`azure-pipelines.yml`) has three stages: Build (produces build/private/public VSIX variants), PublishDev (private marketplace), PublishProd (public marketplace with GitHub release). Both publish stages are currently disabled (condition: false).

## Key Workflows
- **Dev setup**: run `npm run initdev` (installs root + per-task dependencies). Then `npm run build` compiles all tasks. Use `npm run package` for per-task `npm dedupe` and `npm prune --omit=dev` before creating .vsix.
- **Packaging extension**: `npm run package:tasks` runs `tfx extension create --root . --output-path dist --manifest-globs vss-extension.json`.
- **Manifest adjustments**: `fix-manifest-file.ps1` removes files with contentType "application/octet-stream" and re-adds binary/no-extension files from BuildTasks folders to ensure they're included in the VSIX.
- **Test scripts**: `Scripts/test-*.cmd` emulate agent execution by setting `INPUT_*` env vars (uppercase task.json input names) and running the compiled JS entrypoint. Set required endpoint variables like `ENDPOINT_URL_*` and `ENDPOINT_AUTH_*` for service connections.

## Task Implementation Pattern
- **Entry point**: All task TS files use top-level await and call `common.runTfx(async tfx => { ... })` providing an async block that builds CLI args then executes `tfx.execAsync`. Return `true` on success.
- **Input retrieval**: Use `azure-pipelines-task-lib` methods: `tl.getInput(name, required)`, `tl.getBoolInput(name)`, `tl.getPathInput(name)`, `tl.getDelimitedInput(name, delimiter)`. Set task results via `tl.setResult(TaskResult, message)` and output variables with `tl.setVariable(name, value, false, true)` (secret=false, output=true).
- **File globbing**: If a task input allows wildcards (e.g. `vsixFile`), use `tl.findMatch(cwd, pattern)`. Fail early if result count isn't exactly 1 using `tl.setResult(tl.TaskResult.Failed, message)`.
- **Conditional args**: Use ToolRunner's `tfx.argIf(condition, ["--flag", value])` to add args only when condition is truthy. Example: `tfx.argIf(publisher, ["--publisher", publisher])`.
- **JSON output capture**: Tasks add `--json` and `--debug-log-stream stderr` to tfx args, then parse via `new common.TfxJsonOutputStream(handler)`. Pass output through `outStream` and `errorStream` to `tfx.execAsync`, then parse `outputStream.jsonString` to extract values like `json.published`.
- **Authentication**: Call `await commonAuth.setTfxMarketplaceArguments(tfx)` to configure auth. Supports three connection types via `connectTo` input: `VsTeam` (PAT via service endpoint), `AzureRM` (workload identity federation with Marketplace scope `499b84ac-1321-427f-aa17-267ca6975798`), `TFS` (basic auth or PAT for on-prem). Tokens are marked secret via `tl.setSecret()`.
- **Temp files**: Use `writeBuildTempFile(taskName, data)` in Common.ts to create secure temp files (mode 0o600) in `Agent.TempDirectory`. Always clean up via `deleteBuildTempFile(path)` in a finally block or cleanup function.

## Version & Metadata Handling
- Extension version sourced via `common.getExtensionVersion()` (extracts `##.##.##(.##)` pattern from manifest or task inputs). Task can update embedded task versions/IDs when packaging/publishing (`updateTasksVersion`, `updateTasksId`). 
- Logic lives in Common utilities: `checkUpdateTasksManifests()` patches task.json files with new versions using `updateTaskVersion()` and task IDs via `updateTaskId()` (generated using UUID v5 namespacing with publisher+extension+task name).
- `task.json` declares execution targets for multiple Node versions (e.g. `Node20_1`, `Node16`), so generated JS must remain backward-compatible with both.
- **VsixEditor pattern**: Tasks can modify existing VSIX files by creating a `VsixEditor` instance, calling `startEdit()`, making changes via methods like `editPublisher()`, `editVersion()`, `editExtensionVisibility()`, then `endEdit()` to produce a new .gen.vsix file. Used in PublishExtension when overriding metadata without rebuilding from manifest.

## Conventions
- Each task folder structure: `BuildTasks/<Name>/{<Name>.ts, task.json, package.json, tsconfig.json}` plus compiled output folders like `<Name>/`. Avoid cross-imports between tasks except via `../Common/Common.js` and `../Common-Auth/CommonAuth.js`.
- **ES Module imports**: All imports MUST use explicit `.js` extension for runtime resolution (e.g. `import tl from "azure-pipelines-task-lib/task.js"`, `import * as common from "../Common/Common.js"`). This is required by Node's ES module resolution with `"module": "Node16"` in tsconfig. 
- Keep side effects inside the `runTfx` callback; return a resolved `true` to signal completion. Set `tl.setResult(tl.TaskResult.Failed, message)` for failures.
- Prefer adding new shared logic to `Common.ts` instead of duplicating in tasks. Export functions, not just default objects.
- TypeScript config: uses strict mode with `strictNullChecks: false`, targeting ES2022 with Node16 module resolution, project references enabled.

## Adding or Modifying a Task
1. Copy an existing task folder structure (e.g. `PublishExtension`) and adjust `task.json` metadata (id, name, inputs, demands, execution target). Each input needs `name`, `type`, `label`, `required`, and optionally `defaultValue`, `helpMarkDown`, and `options` (for radio/picklist types).
2. Implement logic following the existing pattern: gather inputs early; validate file existence; build `tfx` args with `tfx.arg()` and `tfx.argIf()`; execute once; parse JSON output; set result & output variable.
3. Add the task path to `vss-extension.json` under `files` array (e.g. `{"path": "BuildTasks/YourTask"}`) and a contribution entry under `contributions` if it's a new task (type: `ms.vss-distributed-task.task`, properties must include `name` matching the folder).
4. Create task-specific `package.json` with necessary dependencies and `tsconfig.json` with project references to shared modules: `{"references": [{"path": "../tsconfig.v5.json"}]}`.
5. Run `npm run initdev` to install dependencies, then `npm run build` and ensure lint passes (`npm run lint:tasks`).
6. If the task needs to modify a VSIX file, import and use `VsixEditor` patterns from `PublishExtension.ts`: instantiate with file path, `startEdit()`, make edits, `endEdit()` to get output path.

## Performance & Size Practices
- After build, pipeline deletes unnecessary files (`*.map`, tests, markdown, licenses, unused platform bins, TypeScript sources) from each task's `node_modules` to shrink VSIX size. See `azure-pipelines.yml` deletion steps for full list.
- `fix-manifest-file.ps1` cleans manifest by removing files marked as "application/octet-stream" and re-adding binary/extensionless files to ensure proper packaging.
- Local dev shouldn't manually prune during iteration; rely on CI or `npm run package` before shipping final VSIX.

## Common Pitfalls
- Forgetting to install per-task dependencies after adding a new task: rerun `npm run initdev`.
- Wildcard file patterns resolving to none or multiple files must fail early with `tl.setResult(Failed, ...)`. Check with `tl.findMatch()` and verify array length is exactly 1.
- Ensure new task inputs align with environment variable naming used in test scripts: `INPUT_<UPPERCASED_INPUT_NAME>` (e.g., `INPUT_CONNECTTO` for `connectTo` input).
- Not using `.js` extension in imports causes runtime failures. Always import compiled modules with `.js` even when writing `.ts` files.
- Maintain Node version compatibility (avoid APIs newer than Node16 unless guarded) since tasks declare execution on multiple Node versions.
- Missing cleanup of temp files causes disk space issues; always use try-finally or cleanup callbacks returned by helper functions like `validateAndSetTfxManifestArguments()`.

## External Integrations
- `tfx-cli` drives extension publishing, sharing, installing; tasks craft CLI args rather than reimplement REST calls.
- Uses `azure-pipelines-task-lib` for agent interaction. Do not replace with ad-hoc env parsing.

## When Unsure
- Inspect a similar existing task’s TS + `task.json` pair.
- Put reusable helpers in `Common.ts` and import them.
- Ask whether a change affects packaging size; if yes, mirror cleanup logic or update `azure-pipelines.yml` pruning step.

Provide feedback on unclear sections or request deeper coverage (e.g. Common utilities breakdown) before expanding this doc.
