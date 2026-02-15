# Migrate from Azure Pipelines to GitHub Actions

This guide explains how to move an extension-publishing pipeline from Azure Pipelines to GitHub Actions.

## Migration approach

1. Keep your existing pipeline logic (package, publish, share, install, wait).
2. Translate each Azure Pipelines step to the equivalent GitHub Actions step.
3. Move credentials from service connections to GitHub secrets (PAT) or OIDC federation.
4. Validate outputs, artifacts, and branch triggers.

## Command/operation equivalence

The same marketplace operations are available on both platforms:

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

Azure Pipelines uses:

```yaml
- task: ExtensionTasks@6
  inputs:
    operation: publish
```

GitHub Actions uses:

```yaml
- uses: jessehouwing/azure-devops-extension-tasks@v6
  with:
    operation: publish
```

## Input mapping

Common input mappings:

- `publisherId` → `publisher-id`
- `extensionId` → `extension-id`
- `rootFolder` → `root-folder`
- `manifestGlobs` → `manifest-globs`
- `publishSource` → `publish-source`
- `vsixFile` → `vsix-file`
- `extensionVersion` → `extension-version`
- `outputVariable` → `output-variable`

## `extensionTag` in v6

In v6, `extensionTag` is no longer supported. Supply the full extension ID yourself on both platforms.

### Example using 2 variables in GitHub Actions

```yaml
env:
  EXTENSION_ID_BASE: vsts-developer-tools-build-tasks
  EXTENSION_ID_SUFFIX: -dev

steps:
  - uses: jessehouwing/azure-devops-extension-tasks@v6
    with:
      operation: publish
      extension-id: ${{ format('{0}{1}', env.EXTENSION_ID_BASE, env.EXTENSION_ID_SUFFIX) }}
```

## Authentication migration

### Option 1: OIDC (recommended)

Azure Pipelines:

- `connectionType: connectedService:AzureRM`
- `connectionNameAzureRM: <arm-oidc-service-connection>`

GitHub Actions:

- `permissions: id-token: write`
- authenticate with `azure/login@v2`
- set `auth-type: oidc` on the action

### Option 2: PAT

Azure Pipelines (service connection):

- `connectionType: connectedService:VsTeam`
- `connectionName: <service-connection-name>`

GitHub Actions (secrets):

- `auth-type: pat`
- `token: ${{ secrets.AZDO_MARKETPLACE_PAT }}`

For complete setup details, see [Authentication and OIDC](./authentication-and-oidc.md).

### Required GitHub secrets for OIDC

Store these secrets in your repository or environment:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

Also ensure workflow permissions include `id-token: write`.

## Variable and output migration

Azure Pipelines variable references:

- `$(VarName)`
- `$(stepName.Extension.OutputPath)`

GitHub Actions references:

- `${{ env.VAR_NAME }}`
- `${{ steps.step_id.outputs.vsix-path }}`

Typical output mapping:

- Azure Pipelines `Extension.OutputPath` → GitHub Actions `vsix-path`
- Azure Pipelines `Extension.Metadata` → GitHub Actions `extension-metadata`
- Azure Pipelines `Extension.ProposedVersion` → GitHub Actions `proposed-version`
- Azure Pipelines `Extension.CurrentVersion` → GitHub Actions `current-version`

## End-to-end example

### Azure Pipelines

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

### GitHub Actions

```yaml
name: publish-extension

on:
  push:
    branches: [main]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - id: package
        uses: jessehouwing/azure-devops-extension-tasks@v6
        with:
          operation: package
          root-folder: .

      - uses: jessehouwing/azure-devops-extension-tasks@v6
        with:
          operation: publish
          auth-type: oidc
          publish-source: vsix
          vsix-file: ${{ steps.package.outputs.vsix-path }}
```

## Cutover checklist

- Recreate triggers/branch filters in `.github/workflows/*.yml`.
- Port any Azure variable groups to GitHub repository/environment secrets.
- Confirm PAT scopes or OIDC federation permissions.
- Run publish in a non-production publisher/extension variant first.
- Add optional `wait-for-validation` and `wait-for-installation` steps after publish/install.
