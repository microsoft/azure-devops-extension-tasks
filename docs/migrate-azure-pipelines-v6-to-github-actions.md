# Migrate from Azure Pipelines to GitHub Actions

This guide explains how to move an extension-publishing pipeline from Azure Pipelines to GitHub Actions.

## Migration approach

1. Keep your existing pipeline logic (package, publish, share, install, wait).
2. Translate each Azure Pipelines step to the equivalent GitHub Actions step.
3. Move credentials from service connections to GitHub secrets (PAT) or OIDC federation.
4. Validate outputs, artifacts, and branch triggers.

## Command/operation equivalence

The same marketplace operations are available on both platforms, but 3 operation values differ by platform naming.

- `package`
- `publish`
- `unpublish`
- `share`
- `unshare`
- `install`
- `show`
- Azure Pipelines: `queryVersion`, GitHub Actions: `query-version`
- Azure Pipelines: `waitForValidation`, GitHub Actions: `wait-for-validation`
- Azure Pipelines: `waitForInstallation`, GitHub Actions: `wait-for-installation`

Azure Pipelines uses:

```yaml
- task: azdo-marketplace@6
  inputs:
    operation: publish
```

GitHub Actions uses:

```yaml
- uses: jessehouwing/azdo-marketplace@v6
  with:
    operation: publish
```

## Input mapping

Common input mappings:

- `publisherId` → `publisher-id`
- `extensionId` → `extension-id`
- `manifestFile` → `manifest-file`
- `use` → `use` (publish flows)
- `vsixFile` → `vsix-file`
- `extensionVersion` → `extension-version`
- `localizationRoot` → `localization-root`
- `extensionPricing` → `extension-pricing`
- `updateTasksVersion` (`none`\|`major`\|`minor`\|`patch`) → `update-tasks-version` (`none`\|`major`\|`minor`\|`patch`)

### Consolidated inputs

- Use `accounts` for `install`, `share`, `unshare`, and wait operations on both platforms.
- Do not map any publish sharing input; publish-time sharing was removed. Use a dedicated `share` step with `accounts`.
- For `install`, `share`, `unshare`, `unpublish`, and `waitForValidation`/`wait-for-validation`, identity can be inferred from either manifest (`manifestFile`/`manifest-file`) or VSIX (`vsixFile`/`vsix-path`) inputs.

## Account input mapping

When moving account-targeted operations to GitHub Actions:

- Use `accounts` for `install`, `waitForInstallation` (Azure Pipelines) / `wait-for-installation` (GitHub Actions), `share`, and `unshare`.
- `install` and wait-for-installation flows do not use `service-url`.
- Azure DevOps Services values may be either:
  - `ORG` (automatically expanded to `https://dev.azure.com/ORG`)
  - `https://dev.azure.com/ORG`
- Azure DevOps Server/TFS values must be full collection URLs (for example `https://myserver/tfs/DefaultCollection`).

## `extensionTag` in v6

In v6, `extensionTag` is no longer supported. Supply the full extension ID yourself on both platforms.

### Example using 2 variables in GitHub Actions

```yaml
env:
  EXTENSION_ID_BASE: vsts-developer-tools-build-tasks
  EXTENSION_ID_SUFFIX: -dev

steps:
  - uses: jessehouwing/azdo-marketplace@v6
    with:
      operation: publish
      extension-id: ${{ format('{0}{1}', env.EXTENSION_ID_BASE, env.EXTENSION_ID_SUFFIX) }}
```

## `outputVariable` / `output-variable` in v6

Custom output variable inputs are no longer supported.

- Azure Pipelines: `outputVariable` removed
- GitHub Actions: `output-variable` removed

Use standard step outputs only:

- package: `vsix-path`
- publish: `vsix-path`
- show: `metadata`
- queryVersion/query-version: `proposed-version`, `current-version`

## Authentication migration

### Option 1: OIDC (recommended)

Azure Pipelines:

- `connectionType: WorkloadIdentity`
- `connectionNameWorkloadIdentity: <azure-devops-workload-identity-service-connection>`
- `connectionType: AzureRM`
- `connectionNameAzureRm: <arm-oidc-service-connection>`

GitHub Actions:

- `permissions: id-token: write`
- authenticate with `azure/login@v2`
- set `auth-type: oidc` on the action

### Option 2: PAT

Azure Pipelines (service connection):

- `connectionType: PAT`
- `connectionNamePAT: <service-connection-name>`

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
- `$(stepName.vsixPath)`

GitHub Actions references:

- `${{ env.VAR_NAME }}`
- `${{ steps.step_id.outputs.vsix-path }}`

Typical output mapping:

- Azure Pipelines `vsixPath` → GitHub Actions `vsix-path`
- Azure Pipelines `extensionMetadata` → GitHub Actions `metadata`
- Azure Pipelines `proposedVersion` → GitHub Actions `proposed-version`
- Azure Pipelines `currentVersion` → GitHub Actions `current-version`

## Status mapping

Legacy v5/v6 status-style task outputs are not used in GitHub Actions. Use built-in workflow status instead.

| Azure Pipelines legacy output | GitHub Actions equivalent        |
| ----------------------------- | -------------------------------- |
| `published`                   | `${{ steps.<step_id>.outcome }}` |
| `shared`                      | `${{ steps.<step_id>.outcome }}` |
| `unshared`                    | `${{ steps.<step_id>.outcome }}` |
| `installed`                   | `${{ steps.<step_id>.outcome }}` |
| `waitForValidation`           | `${{ steps.<step_id>.outcome }}` |
| `waitForInstallation`         | `${{ steps.<step_id>.outcome }}` |

Use `${{ steps.<step_id>.conclusion }}` when `continue-on-error: true` is involved and you need post-step branching based on final conclusion semantics.

Current Azure Pipelines v6 task outputs are `vsixPath`, `extensionMetadata`, `proposedVersion`, and `currentVersion`; status-style outputs are legacy and should not be relied on.

## End-to-end example

### Azure Pipelines

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
        uses: jessehouwing/azdo-marketplace@v6
        with:
          operation: package

      - uses: jessehouwing/azdo-marketplace@v6
        with:
          operation: publish
          auth-type: oidc
          use: vsix
          vsix-file: ${{ steps.package.outputs.vsix-path }}
```

## Cutover checklist

- Recreate triggers/branch filters in `.github/workflows/*.yml`.
- Port any Azure variable groups to GitHub repository/environment secrets.
- Confirm PAT scopes or OIDC federation permissions.
- Run publish in a non-production publisher/extension variant first.
- Add optional `wait-for-validation` and `wait-for-installation` steps after publish/install.
