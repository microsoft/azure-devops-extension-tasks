# Manifest Handling Refactoring - Summary

## Overview
This refactoring unified manifest handling between package and publish commands by introducing a three-layer Reader→Editor→Writer architecture, eliminating ~200 lines of duplicated code.

## Problem Statement
Before this refactoring:
- Package and publish commands duplicated manifest update logic
- UUID generation code duplicated in both commands
- Version cascading logic duplicated in both commands
- Package command didn't support task version/ID updates (had TODO comment)
- Publish command had separate logic for manifest mode and VSIX mode
- VsixEditor only worked with VSIX files, no filesystem support

## Solution Architecture

### Three-Layer Pattern

#### 1. ManifestReader (Abstract Base)
Defines common interface for reading manifests from any source.

**Implementations:**
- `FilesystemManifestReader` - reads from filesystem directories
  - Supports `packagePath` for directory prefix remapping
  - Example: `{"path": "compiled/cli", "packagePath": "CLI"}` maps `CLI/v2` → `compiled/cli/v2`
- `VsixReader` - reads from ZIP archives

**Key Methods:**
- `readExtensionManifest()` - read vss-extension.json
- `readTaskManifest(taskPath)` - read task.json from specific path
- `readTaskManifests()` - read all task manifests
- `findTaskPaths()` - discover all task directories

#### 2. ManifestEditor (Centralized Logic)
Source-agnostic editor that works with any ManifestReader.

**Key Innovation: `applyOptions()` Method**
All conditional logic for manifest modifications consolidated in one place:
```typescript
await editor.applyOptions({
  publisherId: 'pub',
  extensionId: 'ext',
  extensionTag: 'tag',
  extensionVersion: '1.0.0',
  extensionName: 'My Extension',
  extensionVisibility: 'private',
  extensionPricing: 'free',
  updateTasksVersion: true,
  updateTasksVersionType: 'major',
  updateTasksId: true
});
```

**Centralized Algorithms:**
- UUID v5 generation: `uuidv5('{publisher}.{extensionId}.{taskName}', marketplaceNamespace)`
- Cascading version updates:
  - `major` - updates all three components
  - `minor` - keeps Major, updates Minor+Patch
  - `patch` - keeps Major+Minor, updates Patch only
- Extension ID + tag concatenation
- Visibility/pricing enum mapping

#### 3. Writers
Write modified manifests back to their target.

**Implementations:**
- `FilesystemManifestWriter`
  - Updates task.json files directly on filesystem
  - Supports packagePath for correct source path resolution
  - Generates overrides.json in temp directory for tfx
- `VsixWriter`
  - Updates manifests inside VSIX archive
  - Optimized: only recompresses modified files

### Command Pattern
Both package and publish commands now follow identical pattern (10 lines vs 80+ before):

```typescript
// 1. Create reader (filesystem or VSIX)
const reader = new FilesystemManifestReader({ rootFolder, manifestGlobs, platform });
// OR
const reader = await VsixReader.open(vsixFile);

// 2. Apply all options (ALL logic here)
const editor = ManifestEditor.fromReader(reader);
await editor.applyOptions(options);

// 3. Write changes
const writer = await editor.toWriter();
await writer.writeToFilesystem(); // or writeToVsix()
```

## Key Features

### packagePath Directory Prefix Mapping
Handles extensions where task sources are in different directories than their package structure.

**Without packagePath:**
```
Task1/task.json → reads from Task1/task.json directly
```

**With packagePath:**
```json
{
  "files": [
    { "path": "compiled/task1", "packagePath": "Task1" }
  ]
}
```
- `Task1` → `compiled/task1`
- `Task1/v2` → `compiled/task1/v2`
- `Task1/v2/subfolder` → `compiled/task1/v2/subfolder`

**Important:** Requires path separator to prevent partial matches
- ✅ `Task1/v2` matches and maps
- ❌ `Task1Other` does NOT match `Task1` + `Other`

### FilesystemManifestWriter overrides.json
When modifying extension manifest fields, writer generates an overrides.json file:
```json
{
  "publisher": "new-pub",
  "id": "new-ext-id",
  "version": "2.0.0"
}
```

This file is passed to tfx with `--overrides-file` flag, allowing manifest overrides without modifying source files.

## What Was Removed
- ❌ `VsixEditor` class entirely (replaced by ManifestEditor)
- ❌ Duplicate UUID generation in publish.ts (lines 218-241)
- ❌ Duplicate version calculation in publish.ts
- ❌ Duplicate extension ID + tag concatenation in package.ts and publish.ts
- ❌ All conditional logic from package.ts command (if publisherId, if extensionTag, etc.)
- ❌ All conditional logic from publish.ts command (both manifest and VSIX modes)
- ❌ TODO comment about package not supporting task updates

## Impact

### Code Quality
- **~200 lines of duplicate logic eliminated**
- **Commands reduced from 80+ lines to ~10 lines**
- **Single source of truth** for all manifest modifications
- **Zero code duplication** between package and publish

### Functionality
- ✅ Package command now supports `updateTasksVersion` and `updateTasksId` (matches v5 behavior)
- ✅ Publish manifest mode now supports task updates (was missing)
- ✅ Both modes (VSIX and manifest) use identical logic
- ✅ Supports compiled/built task directories via packagePath
- ✅ Fixes #188: updateTasksId works with compiled task directories

### Testing
Added **55 new test cases** total:
- **23 tests** for FilesystemManifestReader
  - Basic reading, caching, task discovery
  - 10 tests for packagePath scenarios (prefix matching, subdirectories, edge cases)
- **14 tests** for ManifestEditor.applyOptions()
  - All option types, combinations, edge cases
- **18 tests** for FilesystemManifestWriter
  - Writing task manifests, overrides.json generation
  - 8 tests for packagePath write scenarios

## Migration Notes

### For Callers (package/publish commands)
**Before:**
```typescript
// Many lines of conditional logic
if (publisherId) { /* ... */ }
if (extensionTag) { /* concat with ID */ }
if (updateTasksVersion) { /* calculate versions */ }
if (updateTasksId) { /* generate UUIDs */ }
// ... many more lines
```

**After:**
```typescript
const editor = ManifestEditor.fromReader(reader);
await editor.applyOptions(options); // All logic inside
const writer = await editor.toWriter();
await writer.write();
```

### For Manifest Modifications
All modifications now go through `ManifestEditor.applyOptions()`. To add new modification types:
1. Add field to `ApplyManifestOptions` interface
2. Add conditional logic inside `applyOptions()` method
3. Commands automatically support it (no changes needed)

### For packagePath Users
If your extension uses packagePath in files array:
- ✅ Now works correctly with subdirectories
- ✅ Task version updates work with compiled directories
- ✅ Task UUID updates work with compiled directories
- ⚠️ Ensure packagePath names don't have partial overlaps (e.g., "Task" and "TaskOther")

## Files Changed

### Created
- `packages/core/src/manifest-reader.ts` - Abstract base class
- `packages/core/src/manifest-editor.ts` - Unified editor with applyOptions()
- `packages/core/src/filesystem-manifest-reader.ts` - Filesystem implementation
- `packages/core/src/filesystem-manifest-writer.ts` - Filesystem writer
- `MANIFEST_ARCHITECTURE.md` - Detailed architecture documentation

### Modified
- `packages/core/src/vsix-reader.ts` - Now extends ManifestReader
- `packages/core/src/vsix-writer.ts` - Updated to work with ManifestEditor
- `packages/core/src/commands/package.ts` - Simplified to 10 lines using new architecture
- `packages/core/src/commands/publish.ts` - Simplified, both modes use same logic
- `packages/core/src/index.ts` - Export new modules

### Removed
- `packages/core/src/vsix-editor.ts` - Replaced by ManifestEditor

### Tests
- `packages/core/src/__tests__/filesystem-manifest-reader.test.ts` - 23 tests
- `packages/core/src/__tests__/manifest-editor-apply-options.test.ts` - 14 tests
- `packages/core/src/__tests__/filesystem-manifest-writer.test.ts` - 18 tests
- Updated existing VsixWriter tests to use ManifestEditor

## Performance Considerations

### VsixWriter Optimization
Only modified entries are recompressed. Unchanged entries are copied directly from source VSIX to output VSIX, significantly faster for large extensions with few changes.

### Caching
- ManifestReader caches parsed manifests
- packagePath map built once and cached
- Task manifests cached after first read

## Future Enhancements
Potential improvements building on this architecture:

1. **Validation Layer**: Add manifest validation in ManifestEditor before writes
2. **Dry Run Mode**: Preview what changes would be made without writing
3. **Diff Output**: Show what changed between original and modified manifests
4. **Rollback Support**: Store original manifests for undo operations
5. **Additional Readers**: S3Reader, HttpReader for remote manifests
6. **Schema Validation**: Validate manifests against official schema
7. **Migration Tools**: Automate upgrades between manifest versions

## Conclusion
This refactoring successfully:
- ✅ Eliminated all code duplication between commands
- ✅ Centralized all manifest modification logic
- ✅ Added missing functionality to package command
- ✅ Fixed packagePath handling for compiled directories
- ✅ Maintained backward compatibility (no breaking changes to command interfaces)
- ✅ Added comprehensive test coverage (55 new tests)
- ✅ Improved code maintainability significantly

The new architecture makes it trivial to add new manifest modifications or support new manifest formats - all changes go in one place (ManifestEditor), and all commands automatically benefit.
