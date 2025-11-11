# AI Coding Agent Instructions

Purpose: Help agents quickly contribute to Azure DevOps Extension Tasks (publishing & packaging tasks for Azure/VS Marketplace).

## Big Picture
- This repo builds an Azure DevOps extension that contributes multiple pipeline tasks (see `vss-extension.json` > `contributions`). Each task lives under `BuildTasks/<TaskName>/v5/` with a `task.json` (declarative metadata) and a TypeScript implementation file compiled to JS.
- Tasks wrap the `tfx-cli` to package/publish/share/install/query Azure DevOps & Visual Studio extensions. Common cross-cutting logic (auth, arg building, JSON stream parsing, version utilities) is centralized in `BuildTasks/Common/v5/Common.ts`.
- Build flow: install dependencies locally per task folder, compile TS with project references, lint, then prune/dedupe before packaging the VSIX manifest.
- CI pipeline (`azure-pipelines.yml`) produces three VSIX variants (build/private/public) and optionally publishes them.

## Key Workflows
- Dev setup: run `npm run initdev` (installs root deps + each task's deps). Then `npm run build` compiles all tasks. Use `npm run package` for per-task dependency pruning before creating .vsix.
- Packaging extension (local): `tfx extension create --root . --output-path dist --manifest-globs vss-extension.json` (scripted by `package:tasks`).
- Manifest adjustments: `fix-manifest-file.ps1` cleans & re-adds certain binary/no-extension files before packaging.
- Test scripts (`test-*.cmd`) emulate agent execution by setting `INPUT_*` env vars matching `task.json` inputs and running the task's generated JS entrypoint.

## Task Implementation Pattern
- Entry script calls `common.runTfx(async tfx => { ... })` providing an async block that builds CLI args then executes `tfx.execAsync`.
- Inputs are fetched using `azure-pipelines-task-lib` (`tl.getInput`, `tl.getBoolInput`, `tl.getPathInput`, `tl.getDelimitedInput`). Task results set via `tl.setResult` and output variables with `tl.setVariable`.
- File globbing: if a task allows wildcard inputs (e.g. `vsixFile`), use `tl.findMatch(cwd, pattern)` and enforce exactly one match.
- Conditional arg inclusion uses `tfx.argIf(condition, ["--flag", value])` (defined in common helpers).
- JSON output capture: tasks redirect `tfx` output to stderr or stdout and then parse via `new common.TfxJsonOutputStream(...)` to inspect `json.published` or similar properties.

## Version & Metadata Handling
- Extension version sourced via `common.getExtensionVersion()` (uses manifest or task inputs). Task can update embedded task versions/IDs when packaging/publishing (`updateTasksVersion`, `updateTasksId`). Logic lives in Common utilities.
- `task.json` declares execution targets for multiple Node versions (e.g. `Node20_1`, `Node16`), so generated JS must remain backward-compatible with both.

## Conventions
- Each task folder structure: `BuildTasks/<Name>/v5/{<Name>.ts, task.json, package.json, tsconfig.json}`; compiled JS ends parallel to TS. Avoid cross-imports between tasks except via `../Common/v5/Common.js`.
- Use explicit relative imports ending in `.js` for runtime JS resolution (e.g. `import tl from "azure-pipelines-task-lib/task.js"`).
- Keep side effects inside the `runTfx` callback; return a resolved `true` to signal completion.
- Prefer adding new shared logic to `Common.ts` instead of duplicating in tasks.

## Adding or Modifying a Task
1. Copy an existing task folder structure (e.g. `PublishExtension/v5`) and adjust `task.json` metadata (id, name, inputs, demands, execution target).
2. Implement logic following the existing pattern: gather inputs early; validate file existence; build `tfx` args; execute once; parse JSON; set result & output variable.
3. Add the task path to `vss-extension.json` under `files` and a contribution entry under `contributions` if it's a new task.
4. Run `npm run build` and ensure lint passes (`npm run lint:tasks`).
5. If the task needs to modify the VSIX, reuse `VsixEditor` patterns from `PublishExtension.ts`.

## Performance & Size Practices
- After build, pipeline deletes unnecessary files (`*.map`, tests, markdown, licenses, unused platform bins) from each task's `node_modules` to shrink VSIX size.
- Local dev shouldn’t manually prune during iteration; rely on CI or `npm run package` before shipping.

## Common Pitfalls
- Forgetting to install per-task dependencies after adding a new task: rerun `npm run initdev`.
- Wildcard file patterns resolving to none or multiple files must fail early with `tl.setResult(Failed, ...)`.
- Ensure new task inputs align with environment variable naming used in test scripts (`INPUT_<uppercased input name>` pattern in legacy tests).
- Maintain Node version compatibility (avoid APIs newer than Node16 unless guarded).

## External Integrations
- `tfx-cli` drives extension publishing, sharing, installing; tasks craft CLI args rather than reimplement REST calls.
- Uses `azure-pipelines-task-lib` for agent interaction. Do not replace with ad-hoc env parsing.

## When Unsure
- Inspect a similar existing task’s TS + `task.json` pair.
- Put reusable helpers in `Common.ts` and import them.
- Ask whether a change affects packaging size; if yes, mirror cleanup logic or update `azure-pipelines.yml` pruning step.

Provide feedback on unclear sections or request deeper coverage (e.g. Common utilities breakdown) before expanding this doc.
