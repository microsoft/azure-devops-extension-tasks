---
applyTo: 'vss-extension.json,**/vss-extension.json,packages/**/task.json'
description: Guidance for Azure DevOps extension and task manifests
---

- When editing `vss-extension.json` or any Azure Pipelines `task.json`, preserve schema-compatible structure and required fields.
- For Azure Pipelines task manifests, use the official schema as the source of truth:
  - https://github.com/microsoft/azure-pipelines-task-lib/blob/master/tasks.schema.json
- Keep input and output variable naming consistent and update any runtime input/output lookups when manifest names change.
- Update manifest help text examples when input names are renamed so examples stay accurate.
