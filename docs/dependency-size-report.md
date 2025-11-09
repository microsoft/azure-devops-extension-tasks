# Dependency Size Report

Generated: 2025-11-09T15:12:39.243Z

## Summary

- **Total tasks analyzed:** 20
- **Total node_modules size:** 0 B
- **Average size per task:** 0 B

## Size by Task

| Task | Version | Dependencies | Dev Dependencies | node_modules Size | Installed |
|------|---------|--------------|------------------|-------------------|------------|
| Common | v4 | 4 | 1 | 0 B | ✗ |
| Common | v5 | 5 | 1 | 0 B | ✗ |
| ExtensionVersion | v4 | 4 | 0 | 0 B | ✗ |
| ExtensionVersion | v5 | 5 | 0 | 0 B | ✗ |
| InstallExtension | v4 | 4 | 0 | 0 B | ✗ |
| InstallExtension | v5 | 5 | 0 | 0 B | ✗ |
| IsValidExtensionAgent | v4 | 5 | 0 | 0 B | ✗ |
| IsValidExtensionAgent | v5 | 6 | 0 | 0 B | ✗ |
| PackageExtension | v4 | 4 | 0 | 0 B | ✗ |
| PackageExtension | v5 | 5 | 0 | 0 B | ✗ |
| PublishExtension | v4 | 9 | 0 | 0 B | ✗ |
| PublishExtension | v5 | 8 | 0 | 0 B | ✗ |
| PublishVSExtension | v4 | 4 | 0 | 0 B | ✗ |
| PublishVSExtension | v5 | 5 | 0 | 0 B | ✗ |
| ShareExtension | v4 | 4 | 0 | 0 B | ✗ |
| ShareExtension | v5 | 5 | 0 | 0 B | ✗ |
| TfxInstaller | v4 | 3 | 0 | 0 B | ✗ |
| TfxInstaller | v5 | 7 | 0 | 0 B | ✗ |
| UnpublishExtension | v4 | 4 | 0 | 0 B | ✗ |
| UnpublishExtension | v5 | 5 | 0 | 0 B | ✗ |

## Common Dependencies

Dependencies used across multiple tasks:

| Dependency | Used By # Tasks |
|------------|----------------|
| `azure-pipelines-task-lib` | 20 |
| `tmp` | 20 |
| `fs-extra` | 18 |
| `uuidv5` | 18 |
| `azure-pipelines-tasks-azure-arm-rest` | 10 |
| `promise-retry` | 2 |
| `core-js` | 2 |
| `temp` | 2 |
| `x2js` | 2 |
| `azure-pipelines-tool-lib` | 2 |

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
| `temp` | Temporary file handling - could use native os.tmpdir |
| `promise-retry` | Retry logic - could implement simple version |

## All Unique Dependencies

Complete list of all unique dependencies across tasks:

**Total unique dependencies:** 15

### 7zip

- `7zip-bin`
- `7zip-bin-win`

### @xmldom

- `@xmldom/xmldom`

### azure

- `azure-pipelines-task-lib`
- `azure-pipelines-tasks-azure-arm-rest`
- `azure-pipelines-tool-lib`

### core

- `core-js`

### fs

- `fs-extra`

### path

- `path`

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

