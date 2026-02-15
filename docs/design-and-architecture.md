# Design and Architecture (v6)

## Overview

v6 is built as a **unified core + thin platform adapters** architecture:

- `packages/core`: platform-agnostic business logic
- `packages/azdo-task`: Azure Pipelines adapter
- `packages/github-action`: GitHub Actions adapter
- `packages/azdo-server-task`: server-side gate/check metadata

The goal is to keep behavior consistent across both automation platforms while minimizing duplication.

## Package layout

- `packages/core/src/commands/`: command implementations (`package`, `publish`, `install`, etc.)
- `packages/core/src/manifest-*`: manifest read/edit/write pipeline
- `packages/core/src/vsix-*`: VSIX read/write path
- `packages/core/src/tfx-manager.ts`: tfx-cli resolution and lifecycle
- `packages/core/src/validation.ts`: centralized input validation
- `packages/azdo-task/src/main.ts`: Azure Pipelines routing entry point
- `packages/github-action/src/main.ts`: GitHub Actions routing entry point

## Adapter model

Platform-specific details are abstracted behind `IPlatformAdapter`:

- input/output access
- secret masking
- process execution
- tool lookup and caching
- logging

This keeps command logic independent of `azure-pipelines-task-lib` or `@actions/core`.

## Manifest architecture

The manifest flow is Reader → Editor → Writer:

1. **Reader**: load manifests from filesystem or VSIX
2. **Editor**: apply source-agnostic mutations (`applyOptions`)
3. **Writer**: persist back to filesystem or VSIX

Key behaviors handled centrally in editor/writer layer:

- extension ID + tag composition
- task version cascade (`major` | `minor` | `patch`)
- deterministic task ID regeneration
- visibility/pricing overrides
- overrides emission for packaging/publishing flows

## Command execution pattern

Each command follows a common flow:

1. Validate and normalize options
2. Resolve `tfx` executable using `TfxManager` (`built-in`, `path`, or version spec)
3. Build command arguments
4. Execute via platform adapter
5. Parse output and map outputs

## Build, test, and bundle

- TypeScript project references and npm workspaces are used across packages.
- Runtime module system is ESM (`Node16` resolution rules, `.js` import suffixes).
- Bundling is performed by `Scripts/bundle.mjs` into:
  - `packages/azdo-task/dist/bundle.js`
  - `packages/github-action/dist/bundle.js`

## Design constraints

- Keep core platform-agnostic.
- Keep adapters thin and declarative.
- Keep manifest mutations centralized in manifest editor pipeline.
- Keep command behavior consistent across Azure Pipelines and GitHub Actions.
