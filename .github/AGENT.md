# AGENT.md — Copilot Coding Agent Instructions

## Repository Overview

Azure DevOps Extension Tasks v6 - a unified Azure Pipelines task and GitHub Action for packaging and publishing Azure DevOps extensions to the Visual Studio Marketplace.

**Architecture**: npm workspace monorepo with 4 packages:

- `packages/core` — Platform-agnostic extension task business logic
- `packages/azdo-task` — Azure Pipelines task adapter (unified task for all operations)
- `packages/azdo-server-task` — Azure Pipelines server task (gate/check for validation status)
- `packages/github-action` — GitHub Actions adapter

## Quick Start

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Run Jest tests
npm run test

# Run tests with coverage
npm run test:coverage

# Bundle for distribution (esbuild)
npm run bundle

# Linting and formatting
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

## Key Commands

| Command                | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `npm run build`        | TypeScript compile all packages (via workspaces) |
| `npm run test`         | Jest unit tests (ESM mode)                       |
| `npm run bundle`       | esbuild bundle for azdo-task and github-action   |
| `npm run lint`         | ESLint check (flat config)                       |
| `npm run lint:fix`     | Auto-fix ESLint issues                           |
| `npm run format`       | Auto-format with Prettier                        |
| `npm run format:check` | Check Prettier formatting                        |

## Architecture Principles

- **Platform-agnostic core**: All business logic in `packages/core/src/` never imports platform-specific packages
- **IPlatformAdapter interface**: Platform adapters implement this interface to abstract input/output/exec/filesystem operations
- **Command pattern**: Each tfx subcommand is a standalone async function
- **Tests use MockPlatformAdapter**: Located in `packages/core/src/__tests__/helpers/`
- **ES Modules**: All imports MUST use explicit `.js` extension (e.g., `import * as common from "./module.js"`)
- **Node 16+ module resolution**: TypeScript config uses `"module": "Node16"` and `"moduleResolution": "Node16"`

## File Organization

```
/
├── packages/                          # Workspace packages
│   ├── core/                          # @extension-tasks/core
│   │   ├── src/
│   │   │   ├── index.ts               # Public API barrel
│   │   │   ├── platform.ts            # IPlatformAdapter interface
│   │   │   ├── commands/              # Command implementations
│   │   │   └── __tests__/             # Jest tests
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── azdo-task/                     # Azure Pipelines task adapter
│   ├── azdo-server-task/              # Azure Pipelines server task (validation gate)
│   └── github-action/                 # GitHub Actions adapter
├── Scripts/
│   └── bundle.mjs                     # esbuild bundling script
├── tsconfig.base.json                 # Shared TypeScript config
├── jest.config.ts                     # Test configuration (Jest + ts-jest)
├── eslint.config.mjs                  # ESLint flat config
├── .prettierrc.yml                    # Prettier configuration
├── .node-version                      # Pin Node.js version (24)
├── vss-extension.json                 # Azure DevOps extension manifest
├── action.yml                         # GitHub Action definition
└── AGENT.md                           # This file
```

## Development Workflow

1. **Make changes** in `packages/core/src/` for business logic
2. **Run tests**: `npm run test` to verify
3. **Lint and format**: `npm run lint:fix && npm run format`
4. **Bundle** (if needed): `npm run bundle` for distribution
5. **Commit** both source and any generated dist/ changes

## CRITICAL: End-of-Job Verification

**Before completing any coding session, ALWAYS run these commands in order:**

```bash
npm run format          # Fix formatting issues
npm run lint:fix        # Fix linting issues
npm run test            # Verify all tests pass
npm run bundle          # Regenerate distribution bundles
```

This ensures:

- Code style is consistent across the codebase
- No linting errors or warnings remain
- All unit tests pass (no regressions)
- Bundle files in `dist/` are up-to-date with source changes

**Do not skip these steps** - CI will fail if bundles are out of sync or tests fail.

## Testing

- Tests use **Jest** with **ts-jest** for ESM support
- Mock implementations in `packages/core/src/__tests__/helpers/mock-platform.ts`
- Test files follow pattern: `**/__tests__/**/*.test.ts`
- Run specific project: `npx jest --selectProjects=core`

## Important Notes

- **ES Module imports**: Always use `.js` extensions in imports, even in `.ts` files
- **Node version**: Pinned to Node 24 in `.node-version`
- **TypeScript strict mode**: Enabled, but `strictNullChecks: false` for gradual migration
- **No class hierarchies**: Prefer standalone functions over classes where possible

## When Unsure

1. Check `.github/copilot-instructions.md` for detailed architecture and patterns
2. Review tests - test files show usage patterns
3. Use platform adapter - never use platform APIs directly
4. Follow the patterns - Reader→Editor→Writer for manifests
5. Ask for clarification if the approach is unclear
