# Manifest Handling Architecture Refactoring

## Overview

This document describes the refactored manifest handling architecture that standardizes how extension and task manifests are read, edited, and written across package and publish commands.

## Problem Statement

Previously, there was significant code duplication between:
- Package command (manifest-based packaging)
- Publish command (both manifest and VSIX-based publishing)
- VsixEditor (for VSIX file modifications)

Each had separate logic for:
- Reading manifests
- Updating task versions
- Generating task UUIDs
- Writing changes back

This led to inconsistencies and made it difficult to maintain the codebase.

## Solution: Unified Architecture

The new architecture introduces a layered approach with three main components:

### 1. ManifestReader (Abstract Base Class)

**Purpose**: Provides a common interface for reading manifests from different sources.

**Key Methods**:
- `readExtensionManifest()`: Read vss-extension.json or extension.vsomanifest
- `readTaskManifest(path)`: Read a specific task.json file
- `findTaskPaths()`: Discover all tasks in the extension
- `readTaskManifests()`: Read all task manifests
- `getMetadata()`: Get quick metadata (publisher, extension ID, version)
- `getTasksInfo()`: Get summary info about all tasks

**Implementations**:

#### VsixReader extends ManifestReader
- Reads from VSIX ZIP archives
- Handles VSIX-specific operations (yauzl for reading)
- Includes zip slip protection
- Caches entries and files for efficiency

#### FilesystemManifestReader extends ManifestReader
- Reads from filesystem directories
- Handles manifest glob patterns
- Resolves task paths relative to root folder
- No caching needed (direct filesystem access)

### 2. ManifestEditor

**Purpose**: Unified editor for modifying extension and task manifests. Works with any ManifestReader implementation.

**Key Features**:
- **Chainable API**: Fluent interface for multiple modifications
- **Source-agnostic**: Works with VSIX or filesystem sources
- **Centralized logic**: All UUID generation and version calculation in one place

**Key Methods**:
- `setPublisher(publisher)`: Change publisher ID
- `setExtensionId(id)`: Change extension ID
- `setVersion(version)`: Change extension version
- `setName(name)`: Change display name
- `setVisibility(visibility)`: Set gallery visibility
- `updateTaskVersion(taskName, version, type)`: Update a single task's version
- `updateTaskId(taskName, publisherId, extensionId)`: Update a single task's UUID
- `updateAllTaskVersions(version, type)`: Update all tasks at once
- `updateAllTaskIds()`: Update all task UUIDs at once

**Version Update Logic** (from v5):
```typescript
// Cascading version updates based on type
switch (versionType) {
  case 'major':
    // Updates all three components
    version = { Major: new.major, Minor: new.minor, Patch: new.patch }
    break;
  case 'minor':
    // Keeps existing Major, updates Minor and Patch
    version = { Major: existing.Major, Minor: new.minor, Patch: new.patch }
    break;
  case 'patch':
    // Keeps existing Major and Minor, updates only Patch
    version = { Major: existing.Major, Minor: existing.Minor, Patch: new.patch }
    break;
}
```

**UUID Generation Logic** (from v5):
```typescript
// Deterministic UUID v5 generation
const marketplaceNamespace = uuidv5('https://marketplace.visualstudio.com/vsts', uuidv5.URL);
const taskNamespace = `${publisherId}.${extensionId}.${taskName}`;
const newId = uuidv5(taskNamespace, marketplaceNamespace);
```

### 3. ManifestWriter (Multiple Implementations)

**Purpose**: Write modified manifests back to their destinations.

#### VsixWriter
- Writes to VSIX ZIP archives (yazl for writing)
- Efficiently copies unchanged entries without recompression
- Only recompresses modified files
- Applies manifest and task manifest changes
- Creates new .vsix file

#### FilesystemManifestWriter
- Writes to filesystem directories
- Updates task.json files directly
- Can update extension manifest (optional)
- **Generates overrides.json** in temp directory for tfx
- Returns path to overrides.json for `tfx --overrides-file` flag

## Usage Patterns

### Package Command (Filesystem → VSIX)

```typescript
// 1. Read from filesystem
const reader = new FilesystemManifestReader({
  rootFolder: './src',
  manifestGlobs: ['vss-extension.json'],
  platform
});

// 2. Edit manifests
const editor = ManifestEditor.fromReader(reader);
await editor
  .setVersion('2.0.0')
  .updateAllTaskVersions('2.0.0', 'major')
  .updateAllTaskIds();

// 3. Write changes to filesystem
const writer = await editor.toWriter(); // Returns FilesystemManifestWriter
await writer.writeToFilesystem();

// 4. Get overrides.json for tfx
const overridesPath = writer.getOverridesPath();
// Pass to tfx: --overrides-file {overridesPath}

// 5. Cleanup
await writer.close();
await reader.close();
```

### Publish Command - Manifest Mode (Filesystem → Publish)

**Exactly the same as package!** The same code handles task updates:

```typescript
const reader = new FilesystemManifestReader({ rootFolder, manifestGlobs, platform });
const editor = ManifestEditor.fromReader(reader);
await editor.updateAllTaskVersions(version, type).updateAllTaskIds();
const writer = await editor.toWriter();
await writer.writeToFilesystem();
const overridesPath = writer.getOverridesPath();
// Pass overridesPath to tfx publish
```

### Publish Command - VSIX Mode (VSIX → Modified VSIX → Publish)

```typescript
// 1. Read from VSIX
const reader = await VsixReader.open('input.vsix');

// 2. Edit manifests
const editor = ManifestEditor.fromReader(reader);
editor
  .setPublisher('new-publisher')
  .setVersion('2.0.0')
await editor
  .updateAllTaskVersions('2.0.0', 'major')
  .updateAllTaskIds();

// 3. Write to new VSIX
const writer = await editor.toWriter(); // Returns VsixWriter
const tempVsixPath = `${tempDir}/temp-${Date.now()}.vsix`;
await writer.writeToFile(tempVsixPath);

// 4. Cleanup
await writer.close();
await reader.close();

// 5. Publish the modified VSIX
// Pass tempVsixPath to tfx publish
```

## Benefits

### 1. Code Reuse
- **Single source of truth** for UUID generation and version calculations
- Package and publish use **identical logic** for task updates
- No duplicate implementation

### 2. Consistency
- All commands behave the same way
- Predictable results across operations
- Matching v5 behavior exactly

### 3. Maintainability
- Changes to UUID/version logic need updates in **one place only**
- Clear separation of concerns (read/edit/write)
- Easy to add new functionality

### 4. Testability
- Each layer can be tested independently
- Mock readers for testing editors
- Mock editors for testing writers

### 5. Extensibility
- Easy to add new reader types (e.g., database, API)
- Easy to add new writer types (e.g., S3, blob storage)
- Editor works with any reader/writer combination

## Implementation Details

### Filesystem Write Strategy

The FilesystemManifestWriter uses two approaches:

1. **Direct filesystem updates**: Modifies task.json files in place
2. **overrides.json generation**: Creates a JSON file for extension manifest overrides

This allows tfx to package with overrides without modifying source files permanently.

### VSIX Write Strategy

The VsixWriter optimizes performance by:

1. Reading the source VSIX once
2. Identifying which files need modification
3. Copying unchanged files directly (no recompression)
4. Only recompressing modified manifest files
5. Writing a new VSIX with all changes applied

### Error Handling

All operations include proper error handling:
- File not found errors
- Invalid manifest JSON
- Missing required fields
- Security violations (zip slip protection)

### Resource Management

All readers and writers implement `close()` for cleanup:
- Readers close file handles and clear caches
- Writers ensure all data is flushed
- Proper try/finally blocks in commands

## Migration from V5

The new architecture fully replicates v5 behavior:

| V5 Component | V6 Equivalent |
|---|---|
| `Common.checkUpdateTasksManifests()` | `ManifestEditor.updateAllTaskVersions()` + `updateAllTaskIds()` |
| `Common.updateTaskId()` | `ManifestEditor.updateTaskId()` (built-in) |
| `Common.updateTaskVersion()` | `ManifestEditor.updateTaskVersion()` (built-in) |
| `VsixEditor` (v5) | `ManifestEditor` + `VsixWriter` |
| Direct file writes | `FilesystemManifestWriter` |
| Overrides generation | `FilesystemManifestWriter.getOverridesPath()` |

## File Structure

```
packages/core/src/
├── manifest-reader.ts           # Abstract base class + interfaces
├── filesystem-manifest-reader.ts # Filesystem implementation
├── vsix-reader.ts               # VSIX implementation (extends ManifestReader)
├── manifest-editor.ts           # Unified editor (works with any reader)
├── filesystem-manifest-writer.ts # Filesystem writer
├── vsix-writer.ts               # VSIX writer (updated to use ManifestEditor)
└── commands/
    ├── package.ts               # Uses Filesystem→Editor→Filesystem flow
    └── publish.ts               # Uses both Filesystem and VSIX flows
```

## Future Enhancements

Potential improvements enabled by this architecture:

1. **Validation**: Add manifest validation in ManifestEditor
2. **Dry-run mode**: Preview changes without writing
3. **Rollback**: Undo manifest changes if publishing fails
4. **Batch operations**: Edit multiple extensions at once
5. **Alternative sources**: Read from git, Azure Repos, npm packages
6. **Alternative destinations**: Write to blob storage, artifact feeds

## Conclusion

The new unified architecture eliminates code duplication, ensures consistency between commands, and makes the codebase more maintainable and extensible. All v5 functionality is preserved while providing a cleaner, more testable design.
