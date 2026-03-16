# Migrate Azure Pipelines from v5 tasks to v6

This guide helps you migrate from the original multi-task v5 setup to the unified v6 task.

- **v5 model**: multiple Azure Pipelines tasks (package/publish/share/install/etc.)
- **v6 model**: one task, `azdo-marketplace@6`, with `operation` selecting the command

## What changes

In v6, all extension operations are routed through one task:

```yaml
- task: azdo-marketplace@6
  inputs:
    operation: publish
```

Supported v6 operations:

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

## Migration checklist

- Install/update to extension version 6 in your Azure DevOps organization.
- Replace each v5 task invocation with `azdo-marketplace@6`.
- Set `operation` to the equivalent command.
- Move authentication inputs to v6 connection inputs:
- `connectionType`
- `connectionNamePAT` (PAT)
- `connectionNameWorkloadIdentity` (Azure DevOps Workload Identity federation)
- `connectionNameAzureRm` (AzureRM OIDC / Entra workload federation)
- `connectionNameBasic` (basic auth)
- Update output variable references to v6 output names.
- Run the pipeline and verify publish/install/validation behavior.

## Command mapping (v5 to v6)

Use this mapping when converting existing YAML:

- Package Extension task → `azdo-marketplace@6` with `operation: package`
- Publish Extension task → `azdo-marketplace@6` with `operation: publish`
- Unpublish Extension task → `azdo-marketplace@6` with `operation: unpublish`
- Share Extension task → `azdo-marketplace@6` with `operation: share`
- Install Extension task → `azdo-marketplace@6` with `operation: install`
- Query Version task → `azdo-marketplace@6` with `operation: queryVersion`
- Wait for Validation task → `azdo-marketplace@6` with `operation: waitForValidation`

Additional commands now available in v6:

- `unshare`
- `show`
- `waitForInstallation`

## Input contract changes

When migrating to v6, update account-related inputs as follows:

- `install` and `waitForInstallation` no longer use `service-url`.
- Use `accounts` (multi-line) for target organizations/collections.
- For Azure DevOps Services, `accounts` supports org names and URLs:
  - `ORG` (automatically expanded to `https://dev.azure.com/ORG`)
  - `https://dev.azure.com/ORG`
- For Azure DevOps Server/TFS, provide the full collection URL in `accounts` (for example `https://myserver/tfs/DefaultCollection`).
- `share` and `unshare` also use the `accounts` input in v6 for consistency.

### Renamed and consolidated inputs (v5 → v6)

Use this mapping carefully when updating YAML:

| v5 input pattern                                             | v6 input                                                 | Notes                                                                                                  |
| ------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `shareWith`, `unshareWith`, operation-specific account lists | `accounts`                                               | Single multi-line input for `install`, `share`, `unshare`, `waitForInstallation`.                      |
| `manifestGlobs`, `manifestPath`                              | `manifestFile`                                           | Single multi-line manifest input used by package, publish, and waitForInstallation.                    |
| `updateTasksVersion` (boolean) + `updateTasksVersionType`    | `updateTasksVersion` (`none`\|`major`\|`minor`\|`patch`) | `none` replaces the old disabled/false behavior.                                                       |
| `serviceUrl` for install/wait-install style flows            | `accounts`                                               | `install` and `waitForInstallation` no longer take `serviceUrl`; each account resolves to service URL. |
| `extensionTag`                                               | _(removed)_                                              | Compose full value into `extensionId` yourself.                                                        |
| `outputVariable` custom name settings                        | _(removed)_                                              | Use built-in task output variables instead.                                                            |
| `versionAction`                                              | `marketplaceVersionAction`                               | **Removed** as alias. Use `marketplaceVersionAction` instead.                                          |
| `extensionVersionOverride`                                   | `versionSource`                                          | **Removed**. Use `versionSource` with semver literals instead of a variable name.                      |

Additional source selection behavior in v6:

- `use` is shown for `package`, `publish`, and `waitForInstallation`.
- `install`, `share`, `unshare`, `unpublish`, and `waitForValidation` can infer identity from either `manifestFile` or `vsixFile`.

Additional v6 package/publish inputs:

- `localizationRoot` for localization files in manifest-based flows.
- `extensionPricing` (`default`, `free`, `paid`) to override pricing metadata.
- Publish-time sharing input has been removed; use separate `share` operation with `accounts`.

## `extensionTag` in v6

In v6, `extensionTag` is no longer supported. Supply the full `extensionId` value yourself.

### Example using 2 variables

```yaml
variables:
  EXTENSION_ID_BASE: 'vsts-developer-tools-build-tasks'
  EXTENSION_ID_SUFFIX: '-dev'

steps:
  - task: azdo-marketplace@6
    inputs:
      operation: publish
      extensionId: '$(EXTENSION_ID_BASE)$(EXTENSION_ID_SUFFIX)'
```

## Before and after example

### Before (v5-style dedicated tasks)

```yaml
steps:
  - task: PackageAzureDevOpsExtension@5
    inputs:
      rootFolder: $(Build.SourcesDirectory)

  - task: PublishAzureDevOpsExtension@5
    inputs:
      connectedServiceName: MyMarketplaceConnection
```

### After (v6 unified task)

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
      vsixFile: $(packageExt.vsixFile)
```

## Authentication changes

v6 supports four connection modes for non-package commands:

- PAT via `PAT`
- Workload Identity via `WorkloadIdentity`
- OIDC via `AzureRM`
- Basic auth via `Basic`

For OIDC setup and Entra workload federation details, see:

- [Authentication and OIDC](./authentication-and-oidc.md)
- [Azure Pipelines usage](./azure-pipelines.md)

## Path handling changes

- `rootFolder` is removed in v6 Azure Pipelines task configuration.
- Unrooted file operations now resolve from the current working directory.
- Keep `manifestFile` and `localizationRoot` paths relative to the working directory.

## Version resolution changes (queryVersion)

In v6, `queryVersion` introduces multi-source version resolution:

- **New input `versionSource`** (default: `marketplace`) — a newline-separated list of sources to consider. The highest valid semver wins.
- **Removed `versionAction` alias** — use `marketplaceVersionAction` instead. Applies only to the marketplace source.
- **Removed `extensionVersionOverride`** — use `versionSource` with a semver literal instead of a pipeline variable name.
- **Auth is optional** — when `marketplace` is not in `versionSource`, no service connection is required.
- **New output `versionSource`** — indicates which source provided the winning version.

### Before (v5-style queryVersion)

```yaml
- task: QueryVersion@5
  name: version
  inputs:
    connectTo: VsTeam
    connectedServiceName: MyMarketplaceConnection
    versionAction: Patch
```

### After (v6 queryVersion — marketplace auto-increment)

```yaml
- task: azdo-marketplace@6
  name: version
  inputs:
    operation: queryVersion
    connectionType: PAT
    connectionNamePAT: MyMarketplaceConnection
    marketplaceVersionAction: patch
```

### After (v6 queryVersion — manifest-only, no auth)

```yaml
- task: azdo-marketplace@6
  name: version
  inputs:
    operation: queryVersion
    versionSource: manifest
```

### After (v6 queryVersion — highest-wins with fallback)

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

## Output variables in v6 (Azure Pipelines)

Azure Pipelines v6 task outputs:

- `vsixFile`
- `extensionMetadata`
- `proposedVersion`
- `currentVersion`

If your v5 pipeline referenced legacy output variable names, update those references to the v6 names.

## Notes and compatibility

- Keep migration incremental: convert one operation at a time if needed.
- Prefer OIDC (`AzureRM`) for cloud-hosted pipelines to avoid long-lived PAT secrets.
- Validate required PAT scopes when using PAT-based connections.
