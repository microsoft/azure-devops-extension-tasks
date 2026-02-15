---
applyTo: 'vss-extension.json,**/vss-extension.json,packages/**/task.json'
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
