# v6 in Azure Pipelines

This repository ships a **single unified Azure Pipelines task** with operation routing:

- Task: `ExtensionTasks@6`
- Definition: `packages/azdo-task/task.json`
- Entry point: `packages/azdo-task/src/main.ts`

## Minimal usage

```yaml
- task: ExtensionTasks@6
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
- `QueryVersion`
- `waitForValidation`
- `waitForInstallation`

## Common inputs

These appear across multiple operations.

### Authentication

- `connectionType` (`connectedService:VsTeam` | `connectedService:AzureRM` | `connectedService:Generic`)
- `connectionName` (when `connectionType = connectedService:VsTeam`)
- `connectionNameAzureRM` (when `connectionType = connectedService:AzureRM`)
- `connectionNameGeneric` (when `connectionType = connectedService:Generic`)

### Identity and tooling

- `publisherId`
- `extensionId`
- `extensionTag` (primarily package/publish)
- `tfxVersion` (`built-in`, `path`, or npm version spec)

### Manifest / package source

- `rootFolder`
- `manifestGlobs`
- `localizationRoot`
- `publishSource` (`manifest` or `vsix`, publish only)
- `vsixFile` (publish from VSIX)

### Overrides and behavior

- `extensionVersion`
- `extensionName`
- `extensionVisibility`
- `extensionPricing`
- `bypassValidation`
- `updateTasksVersion`
- `updateTasksVersionType`
- `updateTasksId`

## Command reference (operations and inputs)

> Inputs listed as **Required** are either task-required or practically required to succeed for that operation.

### `package`

Creates a VSIX from manifest files.

- Required:
  - `operation: package`
- Optional:
  - `rootFolder`, `manifestGlobs`, `localizationRoot`
  - `publisherId`, `extensionId`, `extensionTag`
  - `extensionVersion`, `extensionName`, `extensionVisibility`, `extensionPricing`
  - `outputPath`, `outputVariable`
  - `bypassValidation`, `revVersion`
  - `updateTasksVersion`, `updateTasksVersionType`, `updateTasksId`
  - `tfxVersion`

### `publish`

Publishes to Marketplace from manifest or prebuilt VSIX.

- Required:
  - `operation: publish`
  - `connectionType` + matching connection input
  - `publishSource`
  - If `publishSource = vsix`: `vsixFile`
- Optional:
  - `rootFolder`, `manifestGlobs`, `localizationRoot`
  - `publisherId`, `extensionId`, `extensionTag`
  - `extensionVersion`, `extensionName`, `extensionVisibility`, `extensionPricing`
  - `shareWith`, `noWaitValidation`
  - `bypassValidation`
  - `updateTasksVersion`, `updateTasksVersionType`, `updateTasksId`
  - `tfxVersion`

### `unpublish`

Removes an extension from Marketplace.

- Required:
  - `operation: unpublish`
  - `connectionType` + matching connection input
  - `publisherId`, `extensionId`
- Optional:
  - `tfxVersion`

### `share`

Shares a private extension with organizations.

- Required:
  - `operation: share`
  - `connectionType` + matching connection input
  - `publisherId`, `extensionId`
  - `shareWith` (newline-separated)
- Optional:
  - `tfxVersion`

### `unshare`

Revokes sharing from organizations.

- Required:
  - `operation: unshare`
  - `connectionType` + matching connection input
  - `publisherId`, `extensionId`
  - `unshareWith` (newline-separated)
- Optional:
  - `tfxVersion`

### `install`

Installs extension to one or more Azure DevOps organizations.

- Required:
  - `operation: install`
  - `connectionType` + matching connection input
  - `accounts` (newline-separated)
  - `publisherId`, `extensionId`
- Optional:
  - `extensionVersion`
  - `tfxVersion`

### `show`

Fetches extension metadata.

- Required:
  - `operation: show`
  - `connectionType` + matching connection input
  - `publisherId`, `extensionId`
- Optional:
  - `outputVariable`
  - `tfxVersion`

### `QueryVersion`

Queries current Marketplace version and optionally increments it.

- Required:
  - `operation: QueryVersion`
  - `connectionType` + matching connection input
  - `publisherId`, `extensionId`
- Optional:
  - `versionAction` (`None`, `Major`, `Minor`, `Patch`)
  - `extensionVersionOverride` (variable name)
  - `setBuildNumber`
  - `outputVariable`
  - `tfxVersion`

### `waitForValidation`

Polls Marketplace validation result.

- Required:
  - `operation: waitForValidation`
  - `connectionType` + matching connection input
  - `publisherId`, `extensionId`
- Optional:
  - `rootFolder`, `manifestGlobs`
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
    - `manifestPath`
    - `vsixPath`
  - `timeoutMinutes`, `pollingIntervalSeconds`
  - `tfxVersion`

## Outputs

The task exposes output variables including:

- `Extension.OutputPath`
- `Extension.Metadata`
- `Extension.ProposedVersion`
- `Extension.CurrentVersion`
- `Extension.Published`
- `Extension.Shared`
- `Extension.Unshared`
- `Extension.Installed`
- `Extension.WaitForValidation`
- `Extension.WaitForInstallation`

## Example: package + publish

```yaml
steps:
  - task: ExtensionTasks@6
    name: packageExt
    inputs:
      operation: package
      rootFolder: $(Build.SourcesDirectory)
      outputPath: $(Build.ArtifactStagingDirectory)

  - task: ExtensionTasks@6
    inputs:
      operation: publish
      connectionType: connectedService:VsTeam
      connectionName: MyMarketplaceConnection
      publishSource: vsix
      vsixFile: $(packageExt.Extension.OutputPath)
```
