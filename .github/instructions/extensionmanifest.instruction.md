---
applyTo: 'vss-extension.json,**/vss-extension.json,packages/**/task.json,action.yml,**/action.yaml'
description: Guidance for Azure DevOps extension and task manifests
---

- When editing `vss-extension.json` or any Azure Pipelines `task.json`, preserve schema-compatible structure and required fields.
- For Azure Pipelines task manifests, use the official schema as the source of truth:
  - https://github.com/microsoft/azure-pipelines-task-lib/blob/master/tasks.schema.json
- Keep input and output variable naming consistent and update any runtime input/output lookups when manifest names change.
- Update manifest help text examples when input names are renamed so examples stay accurate.
- When renaming task inputs, keep backward compatibility by adding an `aliases` array to the new canonical input name.
- Include legacy and commonly-used alternate names in `aliases` (for example old camelCase names and kebab-case variants).
- Keep `visibleRule` expressions and execution/runtime references aligned to the canonical input name (not aliases).

## Action wrapper synchronization strategy

- Treat root `action.yml` as the source of truth for shared input/output metadata.
- Keep every composite wrapper `*/action.yaml` synchronized for:
  - input names and defaults
  - forwarded `runs.steps[0].with` mappings
  - input/output descriptions (wrapper descriptions must include root descriptions)
  - operation-scoped required flags comments
- After any change to root `action.yml` or any wrapper `action.yaml`, run the synchronization tests:
  - `packages/github-action/src/__tests__/action-wrapper-contract.test.ts`
  - `packages/github-action/src/__tests__/action-metadata-parity.test.ts`
  - `packages/github-action/src/__tests__/action-required-comments.test.ts`
- Preferred command:
  - `npm test -- packages/github-action/src/__tests__/action-wrapper-contract.test.ts packages/github-action/src/__tests__/action-metadata-parity.test.ts packages/github-action/src/__tests__/action-required-comments.test.ts`
- Do not merge wrapper metadata/input changes until these tests pass.
