# Migrate Azure Pipelines from v5 tasks to v6

This guide helps you migrate from the original multi-task v5 setup to the unified v6 task.

- **v5 model**: multiple Azure Pipelines tasks (package/publish/share/install/etc.)
- **v6 model**: one task, `ExtensionTasks@6`, with `operation` selecting the command

## What changes

In v6, all extension operations are routed through one task:

```yaml
- task: ExtensionTasks@6
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
- `query-version`
- `wait-for-validation`
- `wait-for-installation`

## Migration checklist

1. Install/update to extension version 6 in your Azure DevOps organization.
2. Replace each v5 task invocation with `ExtensionTasks@6`.
3. Set `operation` to the equivalent command.
4. Move authentication inputs to v6 connection inputs:
   - `connectionType`
   - `connectionName` (PAT)
   - `connectionNameAzureRM` (OIDC / Entra workload federation)
   - `connectionNameGeneric` (basic auth)
5. Update output variable references to v6 output names.
6. Run the pipeline and verify publish/install/validation behavior.

## Command mapping (v5 to v6)

Use this mapping when converting existing YAML:

- Package Extension task → `ExtensionTasks@6` with `operation: package`
- Publish Extension task → `ExtensionTasks@6` with `operation: publish`
- Unpublish Extension task → `ExtensionTasks@6` with `operation: unpublish`
- Share Extension task → `ExtensionTasks@6` with `operation: share`
- Install Extension task → `ExtensionTasks@6` with `operation: install`
- Query Version task → `ExtensionTasks@6` with `operation: query-version`
- Wait for Validation task → `ExtensionTasks@6` with `operation: wait-for-validation`

Additional commands now available in v6:

- `unshare`
- `show`
- `wait-for-installation`

## `extensionTag` in v6

In v6, `extensionTag` is no longer supported. Supply the full `extensionId` value yourself.

### Example using 2 variables

```yaml
variables:
  EXTENSION_ID_BASE: 'vsts-developer-tools-build-tasks'
  EXTENSION_ID_SUFFIX: '-dev'

steps:
  - task: ExtensionTasks@6
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

## Authentication changes

v6 supports three connection modes for non-package commands:

- PAT via `connectedService:VsTeam`
- OIDC via `connectedService:AzureRM`
- Basic auth via `connectedService:Generic`

For OIDC setup and Entra workload federation details, see:

- [Authentication and OIDC](./authentication-and-oidc.md)
- [Azure Pipelines usage](./azure-pipelines.md)

## Output variables in v6

Common v6 outputs:

- `Extension.OutputPath`
- `Extension.Metadata`
- `Extension.ProposedVersion`
- `Extension.CurrentVersion`
- `Extension.Published`
- `Extension.Installed`
- `Extension.WaitForValidation`
- `Extension.WaitForInstallation`

If your v5 pipeline referenced legacy output variable names, update those references to the v6 names.

## Notes and compatibility

- Keep migration incremental: convert one operation at a time if needed.
- Prefer OIDC (`connectedService:AzureRM`) for cloud-hosted pipelines to avoid long-lived PAT secrets.
- Validate required PAT scopes when using PAT-based connections.
