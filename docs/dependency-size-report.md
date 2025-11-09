# Dependency Size Report

Generated: 2025-11-09T16:41:03.660Z

## Summary

- **Total tasks analyzed:** 10
- **Tasks with dependencies installed:** 10/10
- **Total node_modules size:** 725.67 MB
- **Average size per task:** 72.57 MB

## Size by Task

| Task | Version | Dependencies | Dev Dependencies | node_modules Size | Installed |
|------|---------|--------------|------------------|-------------------|------------|
| TfxInstaller | v5 | 7 | 0 | 94.18 MB | ✓ |
| PublishExtension | v5 | 8 | 0 | 80.89 MB | ✓ |
| IsValidExtensionAgent | v5 | 6 | 0 | 68.87 MB | ✓ |
| Common | v5 | 5 | 1 | 68.83 MB | ✓ |
| PublishVSExtension | v5 | 5 | 0 | 68.82 MB | ✓ |
| UnpublishExtension | v5 | 5 | 0 | 68.82 MB | ✓ |
| ExtensionVersion | v5 | 5 | 0 | 68.82 MB | ✓ |
| InstallExtension | v5 | 5 | 0 | 68.82 MB | ✓ |
| PackageExtension | v5 | 5 | 0 | 68.82 MB | ✓ |
| ShareExtension | v5 | 5 | 0 | 68.82 MB | ✓ |

## Common Dependencies

Dependencies used across multiple tasks:

| Dependency | Used By # Tasks |
|------------|----------------|
| `azure-pipelines-task-lib` | 10 |
| `azure-pipelines-tasks-azure-arm-rest` | 10 |
| `fs-extra` | 10 |
| `tmp` | 10 |
| `uuidv5` | 10 |

## Optimization Opportunities for Shared Dependencies

**Critical Finding:** Since these 5 dependencies are shared across all 10 tasks, they are duplicated 10 times, contributing significantly to the total 725.67 MB size.

### Detailed Analysis

See **[Dependency Optimization Analysis](dependency-optimization-analysis.md)** for comprehensive recommendations.

**Quick Summary:**

| Dependency | Used By | Total Impact | Recommendation | Est. Savings |
|------------|---------|--------------|----------------|--------------|
| **fs-extra** | 10 tasks | ~1 MB | **REPLACE** with native fs | ~1 MB (easy win) |
| **azure-pipelines-tasks-azure-arm-rest** | 10 tasks | ~100-150 MB | **INVESTIGATE** alternatives | 100-150 MB (high impact) |
| **uuidv5** | 10 tasks | ~100 KB | **KEEP** (tiny, specific) | - |
| **tmp** | 10 tasks | ~500 KB | **KEEP** (security-critical) | - |
| **azure-pipelines-task-lib** | 10 tasks | ~400-500 MB | **KEEP** (necessary) | - |

**Total Potential Savings: ~100-150 MB (14-21% reduction)**

## Candidates for Removal/Replacement

Known dependencies that could be optimized:

| Dependency | Recommendation |
|------------|----------------|
| `@types/node` | TypeScript types - can potentially be unified |
| `azure-pipelines-task-lib` | Core task library - necessary |
| **`azure-pipelines-tasks-azure-arm-rest`** | **HIGHEST PRIORITY** - Brings in entire Azure SDK stack (~100-150 MB across 10 tasks); investigate lightweight alternatives |
| **`fs-extra`** | **QUICK WIN** - Only 1 usage (writeJSON), easily replaced with native fs (~1 MB savings) |
| `q` | Promise library - deprecated, use native Promises |
| `xmldom` | XML parsing - check if needed |
| `tmp` | **KEEP** - Provides security guarantees (unpredictable paths, race condition protection) critical for VSIX packaging; prevents content injection attacks |
| `uuidv5` | **KEEP** - Tiny package (~10 KB), provides UUID v5 functionality |
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

