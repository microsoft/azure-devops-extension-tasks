# v6 in Azure Pipelines

This repository ships a **single unified Azure Pipelines task** with operation routing:

- Task: `azdo-marketplace@6`
- Definition: `packages/azdo-task/task.json`
- Entry point: `packages/azdo-task/src/main.ts`

## Minimal usage

```yaml
- task: azdo-marketplace@6
  inputs:
    operation: package
```

Most non-package operations require a service connection (`connectionType` + corresponding connection input).

## Supported operations

- `package`
- `publish`
- `unpublish`
- `share`
- `unshare`
- `install`
- `show`
- `queryVersion`
- `waitForValidation`
- `waitForInstallation`

## Common inputs

These appear across multiple operations.

### Authentication

- `connectionType` (`PAT` | `WorkloadIdentity` | `AzureRM` | `Basic`)
- `connectionNamePAT` (when `connectionType = PAT`)
- `connectionNameWorkloadIdentity` (when `connectionType = WorkloadIdentity`)
- `connectionNameAzureRm` (when `connectionType = AzureRM`)
- `connectionNameBasic` (when `connectionType = Basic`)

### Identity and tooling

- `publisherId`
- `extensionId`
- `tfxVersion` (`built-in`, `path`, or npm version spec); `built-in` resolves the bundled `tfx-cli` JS entrypoint, `path` resolves `tfx` from PATH

### Manifest / package source

- `manifestFile`
- `localizationRoot`
- `use` (`manifest` or `vsix`) for `package`, `publish`, and `waitForInstallation`
- `vsixFile` (publish from VSIX)

### Overrides and behavior

- `extensionVersion`
- `extensionName`
- `extensionVisibility`
- `extensionPricing`
- `bypassValidation`
- `updateTasksVersion`
- `updateTasksId`

## Command reference (operations and inputs)

> Inputs listed as **Required** are either task-required or practically required to succeed for that operation.

### `package`

Creates a VSIX from manifest files.

- Required:
  - `operation: package`
- Optional:
  - `manifestFile`, `manifestFileJs`, `overridesFile`, `localizationRoot`
  - `publisherId`, `extensionId`
  - `extensionVersion`, `extensionName`, `extensionVisibility`, `extensionPricing`
  - `outputPath`
  - `bypassValidation`
  - `updateTasksVersion`, `updateTasksVersionType`, `updateTasksId`
  - `tfxVersion`

### `publish`

Publishes to Marketplace from manifest or prebuilt VSIX.

- Required:
  - `operation: publish`
  - `connectionType` + matching connection input
  - `use`
  - If `use = vsix`: `vsixFile`
- Optional:
  - `manifestFile`, `manifestFileJs`, `overridesFile`, `localizationRoot`
  - `publisherId`, `extensionId`
  - `extensionVersion`, `extensionName`, `extensionVisibility`, `extensionPricing`
  - `noWaitValidation`
  - `bypassValidation`
  - `updateTasksVersion`, `updateTasksId`
  - `tfxVersion`

### `unpublish`

Removes an extension from Marketplace.

- Required:
  - `operation: unpublish`
  - `connectionType` + matching connection input
- Optional:
  - `publisherId`, `extensionId` (can be inferred from `manifestFile` or `vsixFile`)
  - `manifestFile`, `vsixFile`
  - `tfxVersion`

### `share`

Shares a private extension with organizations.

- Required:
  - `operation: share`
  - `connectionType` + matching connection input
  - `accounts` (newline-separated)
- Optional:
  - `publisherId`, `extensionId` (can be inferred from `manifestFile` or `vsixFile`)
  - `manifestFile`, `vsixFile`
  - `tfxVersion`

### `unshare`

Revokes sharing from organizations.

- Required:
  - `operation: unshare`
  - `connectionType` + matching connection input
  - `accounts` (newline-separated)
- Optional:
  - `publisherId`, `extensionId` (can be inferred from `manifestFile` or `vsixFile`)
  - `manifestFile`, `vsixFile`
  - `tfxVersion`

### `install`

Installs extension to one or more Azure DevOps organizations.

- Required:
  - `operation: install`
  - `connectionType` + matching connection input
  - `accounts` (newline-separated)
- Optional:
  - `publisherId`, `extensionId` (can be inferred from `manifestFile` or `vsixFile`)
  - `manifestFile`, `vsixFile`
  - `extensionVersion`
  - `tfxVersion`

### `show`

Fetches extension metadata.

- Required:
  - `operation: show`
  - `connectionType` + matching connection input
  - `publisherId`, `extensionId`
- Optional:
  - none
  - `tfxVersion`

### `queryVersion`

Resolves the proposed extension version from one or more sources. The highest valid semver wins.

- Required:
  - `operation: queryVersion`
  - `publisherId`, `extensionId` (or inferred from manifest/VSIX)
- Conditionally required:
  - `connectionType` + matching connection input — only when `marketplace` is in `versionSource` (default)
- Optional:
  - `versionSource` (default: `marketplace`; newline-separated list of `marketplace`, `manifest`, `vsix`, or semver literals)
  - `marketplaceVersionAction` (`None`, `Major`, `Minor`, `Patch`; only applies to the marketplace source; alias: `versionAction`)
  - `setBuildNumber`
  - `use`, `vsixFile`, `manifestFile`
  - `tfxVersion`

### `waitForValidation`

Polls Marketplace validation result.

- Required:
  - `operation: waitForValidation`
  - `connectionType` + matching connection input
- Optional:
  - `publisherId`, `extensionId` (can be inferred from `manifestFile` or `vsixFile`)
  - `manifestFile`, `vsixFile`
  - `maxRetries`, `minTimeout`, `maxTimeout`
  - `tfxVersion`

### `waitForInstallation`

Verifies tasks are available after install.

- Required:
  - `operation: waitForInstallation`
  - `connectionType` + matching connection input
  - `publisherId`, `extensionId`
  - `accounts`
- Optional:
  - task expectations via one of:
    - `expectedTasks` (JSON)
    - `manifestFile`
    - `vsixFile`
  - `timeoutMinutes`, `pollingIntervalSeconds`
  - `tfxVersion`

## Outputs

Declared task output variables (from `task.json`):

- `vsixPath`
- `extensionMetadata`
- `proposedVersion` — highest version from all sources
- `currentVersion` — resolved version before increment; when marketplace is queried this is the marketplace version, otherwise it falls back to the selected source version
- `versionSource` — which source won: `marketplace`, `manifest`, `vsix`, or `literal`

These are referenced as step outputs, for example `$(packageExt.vsixPath)`.

## queryVersion examples

### Auto-increment marketplace version (default)

```yaml
- task: azdo-marketplace@6
  name: version
  inputs:
    operation: queryVersion
    connectionType: PAT
    connectionNamePAT: MyMarketplaceConnection
    marketplaceVersionAction: patch
```

### First publish with fallback (marketplace + literal)

```yaml
- task: azdo-marketplace@6
  name: version
  inputs:
    operation: queryVersion
    connectionType: PAT
    connectionNamePAT: MyMarketplaceConnection
    marketplaceVersionAction: patch
    versionSource: |
      marketplace
      1.0.0
```

### Use version from manifest only (no auth required)

```yaml
- task: azdo-marketplace@6
  name: version
  inputs:
    operation: queryVersion
    versionSource: manifest
```

### GitVersion or external tool integration (no auth required)

```yaml
- task: azdo-marketplace@6
  name: version
  inputs:
    operation: queryVersion
    versionSource: $(GitVersion.SemVer)
```

### Highest-wins across multiple sources

```yaml
- task: azdo-marketplace@6
  name: version
  inputs:
    operation: queryVersion
    connectionType: PAT
    connectionNamePAT: MyMarketplaceConnection
    marketplaceVersionAction: patch
    versionSource: |
      marketplace
      $(GitVersion.SemVer)
      manifest
```

Use the output for subsequent steps:

```yaml
- script: echo "Proposed version: $(version.proposedVersion) (from $(version.versionSource))"
```

## Example: package + publish

```yaml
steps:
  - task: azdo-marketplace@6
    name: packageExt
    inputs:
      operation: package
      outputPath: $(Build.ArtifactStagingDirectory)

  - task: azdo-marketplace@6
    inputs:
      operation: publish
      connectionType: PAT
      connectionNamePAT: MyMarketplaceConnection
      use: vsix
      vsixFile: $(packageExt.vsixPath)
```
