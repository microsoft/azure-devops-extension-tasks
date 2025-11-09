# Shared Logic Analysis

Generated: 2025-11-09T15:06:19.482Z

## Summary

- **Total functions analyzed:** 63
- **Duplicate function patterns found:** 16

## Common Library (Existing Shared Code)

### Common v4

**Location:** `BuildTasks/Common/v4/Common.ts`

**Functions exported:** 19

**Function list:**

- `writeBuildTempFile` (9 lines)
- `deleteBuildTempFile` (6 lines)
- `validateAndSetTfxManifestArguments` (131 lines)
- `getExtensionVersion` (13 lines)
- `getMarketplaceEndpointDetails` (16 lines)
- `setTfxMarketplaceArguments` (24 lines)
- `getTaskPathContributions` (10 lines)
- `updateTaskId` (9 lines)
- `updateExtensionManifestTaskIds` (26 lines)
- `updateTaskVersion` (26 lines)
- `updateManifests` (15 lines)
- `updateTaskManifests` (47 lines)
- `updateExtensionManifests` (13 lines)
- `getExtensionManifestPaths` (9 lines)
- `getManifest` (14 lines)
- `getTaskManifestPaths` (32 lines)
- `writeManifest` (3 lines)
- `checkUpdateTasksManifests` (3 lines)
- `tryRunCmd` (16 lines)

### Common v5

**Location:** `BuildTasks/Common/v5/Common.ts`

**Functions exported:** 19

**Function list:**

- `writeBuildTempFile` (9 lines)
- `deleteBuildTempFile` (6 lines)
- `validateAndSetTfxManifestArguments` (131 lines)
- `getExtensionVersion` (13 lines)
- `getMarketplaceEndpointDetails` (16 lines)
- `setTfxMarketplaceArguments` (38 lines)
- `getTaskPathContributions` (10 lines)
- `updateTaskId` (9 lines)
- `updateExtensionManifestTaskIds` (26 lines)
- `updateTaskVersion` (26 lines)
- `updateManifests` (15 lines)
- `updateTaskManifests` (47 lines)
- `updateExtensionManifests` (13 lines)
- `getExtensionManifestPaths` (9 lines)
- `getManifest` (12 lines)
- `getTaskManifestPaths` (32 lines)
- `writeManifest` (3 lines)
- `checkUpdateTasksManifests` (3 lines)
- `tryRunCmd` (16 lines)

## Duplicate Functions (Candidates for Abstraction)

These functions appear multiple times across different tasks and could be moved to the Common library:

| Function Name | Occurrences | Files | Lines |
|---------------|-------------|-------|-------|
| `getExtensionVersion` | 2 | Common | 13 |
| `getMarketplaceEndpointDetails` | 2 | Common | 16 |
| `getTaskPathContributions` | 2 | Common | 10 |
| `updateTaskId` | 2 | Common | 9 |
| `updateTaskVersion` | 2 | Common | 26 |
| `updateManifests` | 2 | Common | 15 |
| `updateExtensionManifests` | 2 | Common | 13 |
| `getExtensionManifestPaths` | 2 | Common | 9 |
| `getTaskManifestPaths` | 2 | Common | 32 |
| `tryRunCmd` | 2 | Common | 16 |
| `setVersion` | 2 | ExtensionVersion | 10 |
| `login` | 2 | PublishVSExtension | 16 |
| `logout` | 2 | PublishVSExtension | 18 |
| `publish` | 2 | PublishVSExtension | 16 |
| `queryLatestMatch` | 2 | TfxInstaller | 12 |
| `acquireTfx` | 2 | TfxInstaller | 30 |

### Detailed Analysis of Top Duplicates

#### 1. `getExtensionVersion`

- **Occurrences:** 2
- **Unique files:** 2
- **Lines of code:** 13

**Found in:**

- `Common/v4/Common.ts`
- `Common/v5/Common.ts`

#### 2. `getMarketplaceEndpointDetails`

- **Occurrences:** 2
- **Unique files:** 2
- **Lines of code:** 16

**Found in:**

- `Common/v4/Common.ts`
- `Common/v5/Common.ts`

#### 3. `getTaskPathContributions`

- **Occurrences:** 2
- **Unique files:** 2
- **Lines of code:** 10

**Found in:**

- `Common/v4/Common.ts`
- `Common/v5/Common.ts`

#### 4. `updateTaskId`

- **Occurrences:** 2
- **Unique files:** 2
- **Lines of code:** 9

**Found in:**

- `Common/v4/Common.ts`
- `Common/v5/Common.ts`

#### 5. `updateTaskVersion`

- **Occurrences:** 2
- **Unique files:** 2
- **Lines of code:** 26

**Found in:**

- `Common/v4/Common.ts`
- `Common/v5/Common.ts`

## Recommendations

### Short-term

1. Review duplicate functions and consider moving to Common library
2. Ensure all tasks use the Common library for shared functionality
3. Standardize error handling and logging patterns

### Long-term

1. Create a unified Common library for both v4 and v5 (or migrate fully to v5)
2. Extract common patterns into reusable helper functions
3. Consider creating domain-specific helper modules (e.g., tfx-helpers, validation-helpers)
4. Implement shared testing utilities for task development

