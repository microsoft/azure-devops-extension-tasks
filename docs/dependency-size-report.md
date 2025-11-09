# Dependency Size Report

Generated: 2025-11-09T16:36:36.488Z

## Summary

- **Total tasks analyzed:** 10
- **Tasks with dependencies installed:** 0/10
- **Total node_modules size:** 0 B
- **Average size per task:** 0 B

⚠️ **Note:** No dependencies are currently installed. To get actual size measurements, run:
```bash
npm run initdev
```
Then re-run this analysis script to see actual dependency sizes.

## Size by Task

| Task | Version | Dependencies | Dev Dependencies | node_modules Size | Installed |
|------|---------|--------------|------------------|-------------------|------------|
| Common | v5 | 5 | 1 | 0 B | ✗ |
| ExtensionVersion | v5 | 5 | 0 | 0 B | ✗ |
| InstallExtension | v5 | 5 | 0 | 0 B | ✗ |
| IsValidExtensionAgent | v5 | 6 | 0 | 0 B | ✗ |
| PackageExtension | v5 | 5 | 0 | 0 B | ✗ |
| PublishExtension | v5 | 8 | 0 | 0 B | ✗ |
| PublishVSExtension | v5 | 5 | 0 | 0 B | ✗ |
| ShareExtension | v5 | 5 | 0 | 0 B | ✗ |
| TfxInstaller | v5 | 7 | 0 | 0 B | ✗ |
| UnpublishExtension | v5 | 5 | 0 | 0 B | ✗ |

## Common Dependencies

Dependencies used across multiple tasks:

| Dependency | Used By # Tasks |
|------------|----------------|
| `azure-pipelines-task-lib` | 10 |
| `azure-pipelines-tasks-azure-arm-rest` | 10 |
| `fs-extra` | 10 |
| `tmp` | 10 |
| `uuidv5` | 10 |

## Candidates for Removal/Replacement

Known dependencies that could be optimized:

| Dependency | Recommendation |
|------------|----------------|
| `@types/node` | TypeScript types - can potentially be unified |
| `azure-pipelines-task-lib` | Core task library - necessary |
| `azure-pipelines-tasks-azure-arm-rest` | Azure ARM REST - could be optimized |
| `fs-extra` | File system utilities - could use native fs |
| `q` | Promise library - deprecated, use native Promises |
| `xmldom` | XML parsing - check if needed |
| `tmp` | **KEEP** - Provides security guarantees (unpredictable paths, race condition protection) critical for VSIX packaging; prevents content injection attacks |
| `promise-retry` | Retry logic - could implement simple version |

## All Unique Dependencies

Complete list of all unique dependencies across tasks:

**Total unique dependencies:** 11

### 7zip

- `7zip-bin`

### azure

- `azure-pipelines-task-lib`
- `azure-pipelines-tasks-azure-arm-rest`
- `azure-pipelines-tool-lib`

### fs

- `fs-extra`

### promise

- `promise-retry`

### temp

- `temp`

### tfx

- `tfx-cli`

### tmp

- `tmp`

### uuidv5

- `uuidv5`

### x2js

- `x2js`

