# Contributing Guide

This repo is an npm workspace monorepo for v6 Azure DevOps extension automation.

## Prerequisites

- Node.js (see `.node-version`)
- npm
- Optional for local end-to-end checks: `tfx-cli` in PATH (unless using built-in mode)

## Initial setup

```bash
npm install
npm run build
npm run test
```

## Workspace structure

- `packages/core`: shared logic
- `packages/azdo-task`: Azure Pipelines adapter
- `packages/github-action`: GitHub Actions adapter
- `packages/azdo-server-task`: server task definition

## Development workflow

1. Implement changes in `packages/core/src` or adapter package as needed.
1. Build all workspaces:

```bash
npm run build
```

1. Run tests:

```bash
npm run test
```

1. Lint and format:

```bash
npm run lint
npm run format:check
```

1. Bundle adapters:

```bash
npm run bundle
```

## Debugging

### Unit-level debugging

- Run focused tests for the changed area, for example:

```bash
$env:NODE_OPTIONS='--experimental-vm-modules'; npx jest packages/core/src/__tests__/query-version.test.ts --runInBand
```

- Use the mock platform adapter test helpers in `packages/core/src/__tests__/helpers` to isolate behavior.

### Adapter debugging

- Azure Pipelines adapter entry: `packages/azdo-task/src/main.ts`
- GitHub adapter entry: `packages/github-action/src/main.ts`
- Confirm input mapping and routing logic first before changing core command behavior.

### Auth/OIDC debugging

- Verify secret masking happens immediately after token acquisition.
- Verify service connection/auth-type selection matches operation.
- For OIDC issues, verify tenant, audience, and federated credential subject conditions.

## Testing strategy

Use a narrow-to-broad progression:

1. Run impacted unit tests first.
2. Run all tests once local fixes are stable.
3. Rebuild and rebundle to ensure distribution outputs stay in sync.

## Required end-of-job verification

Before opening a PR, run:

```bash
npm run format
npm run lint:fix
npm run test
npm run bundle
```

## Coding conventions

- Keep `packages/core` platform-agnostic.
- Use adapter abstractions (`IPlatformAdapter`) instead of platform SDKs in core.
- Use ESM import paths with `.js` suffix in TypeScript source where required by project config.
- Keep changes minimal and aligned with existing patterns.

## Documentation updates

If you add or change inputs/operations:

- update `packages/azdo-task/task.json` and/or `action.yml`
- update command composite wrappers (`*/action.yaml`) if relevant
- update docs in this `docs/` folder
