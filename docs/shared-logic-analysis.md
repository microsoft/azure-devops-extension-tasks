# Shared Logic Analysis

Generated: 2025-11-09T15:26:23.489Z

## Summary

- **Total functions analyzed:** 30
- **Duplicate function patterns found:** 0

## Common Library (Existing Shared Code)

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

*No significant duplicate functions found (most logic is already in Common library)*

## Recommendations

### Short-term

1. Review duplicate functions and consider moving to Common v5 library
2. Ensure all v5 tasks use the Common v5 library for shared functionality
3. Standardize error handling and logging patterns

### Long-term

1. Continue expanding the Common v5 library with reusable functionality
2. Extract common patterns into reusable helper functions
3. Consider creating domain-specific helper modules (e.g., tfx-helpers, validation-helpers)
4. Implement shared testing utilities for task development

