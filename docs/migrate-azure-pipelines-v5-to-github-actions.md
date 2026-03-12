# Migrate from Azure Pipelines v5 to GitHub Actions

This guide is for teams that still run the original Azure Pipelines v5 task model and want to move directly to GitHub Actions.

## Recommended strategy

Use one of these paths:

- **Direct migration**: v5 Azure Pipelines → GitHub Actions (fastest)
- **Staged migration**: v5 Azure Pipelines → Azure Pipelines v6 → GitHub Actions (lowest risk)

If your pipeline is heavily customized, the staged migration is usually easier to validate.

## v5 task intent to GitHub Actions mapping

Map each legacy task purpose to a GitHub Actions `operation`:

- Package Extension task → `operation: package`
- Publish Extension task → `operation: publish`
- Unpublish Extension task → `operation: unpublish`
- Share Extension task → `operation: share`
- Install Extension task → `operation: install`
- Query Version task → `operation: query-version`
- Wait for Validation task → `operation: wait-for-validation`

Additional operations available when migrating:

- `unshare`
- `show`
- `wait-for-installation`

## Input migration quick map

Common conversions from Azure Pipelines-style names to GitHub Actions inputs:

- `publisherId` → `publisher-id`
- `extensionId` → `extension-id`
- `extensionTag` → `extension-id`
- `manifestFile` → `manifest-file`
- `use` → `use` (publish flows)
- `vsixFile` → `vsix-file`
- `extensionVersion` → `extension-version`

### Consolidated/renamed inputs to watch

| Legacy pattern                                            | GitHub Actions v6 input                                    | Notes                                                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `shareWith`, `unshareWith`, install target account lists  | `accounts`                                                 | Single newline-separated input for `install`, `share`, `unshare`, `wait-for-installation`. |
| `updateTasksVersion` (boolean) + `updateTasksVersionType` | `update-tasks-version` (`none`\|`major`\|`minor`\|`patch`) | `none` is the disabled mode.                                                               |
| `serviceUrl` for install/wait-install style flows         | `accounts`                                                 | `install` and `wait-for-installation` use `accounts` instead of `service-url`.             |
| `extensionTag`                                            | _(removed)_                                                | Compose full `extension-id` yourself.                                                      |
| `versionAction`                                           | `marketplace-version-action`                               | **Removed**. Use `marketplace-version-action` instead.                                     |
| `extensionVersionOverride`                                | `version-source`                                           | **Removed**. Use `version-source` with semver literals instead of a variable name.         |

Package/publish metadata inputs available in v6:

- `localization-root` for localization files in manifest-based package/publish flows.
- `extension-pricing` (`default`, `free`, `paid`) to override marketplace pricing metadata.
- Publish-time sharing input is removed; run `operation: share` with `accounts` after publish.

## Account input migration

For account-targeted operations in GitHub Actions:

- Use `accounts` for `install`, `wait-for-installation`, `share`, and `unshare`.
- Do not use `service-url` for `install` or `wait-for-installation`.
- Azure DevOps Services account values can be either:
  - `ORG` (automatically expanded to `https://dev.azure.com/ORG`)
  - `https://dev.azure.com/ORG`
- Azure DevOps Server/TFS values must be full collection URLs (for example `https://myserver/tfs/DefaultCollection`).

## `extensionTag` in v6

In v6, `extensionTag` is no longer supported. Supply the full `extension-id` value yourself.

### Example using 2 variables

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

Custom output variable inputs are no longer supported in this v6 rebuild.

Use standard step outputs only:

- package: `${{ steps.package.outputs.vsix-path }}`
- publish: `${{ steps.publish.outputs.vsix-path }}`
- show: `${{ steps.show.outputs.metadata }}`
- query-version: `${{ steps.version.outputs.proposed-version }}`, `${{ steps.version.outputs.current-version }}`

## Authentication migration

### OIDC / Entra workload federation (recommended)

In GitHub Actions:

1. Grant `id-token: write` permission.
2. Authenticate with `azure/login@v2`.
3. Run this action with `auth-type: oidc`.

See full setup in [Authentication and OIDC](./authentication-and-oidc.md).

### Required GitHub secrets for OIDC

Store these secrets in your repository or environment:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

Also ensure workflow permissions include `id-token: write`.

### PAT (alternative)

If you are not ready for OIDC yet:

- set `auth-type: pat`
- pass token from a repository/environment secret

```yaml
- uses: jessehouwing/azdo-marketplace@v6
  with:
    operation: publish
    auth-type: pat
    token: ${{ secrets.AZDO_MARKETPLACE_PAT }}
```

## Version resolution changes (query-version)

In v6, `query-version` introduces multi-source version resolution:

- **New input `version-source`** (default: `marketplace`) — a newline-separated list of sources. The highest valid semver wins.
- **Removed `version-action`** — use `marketplace-version-action` instead. Applies only to the marketplace source.
- **Removed `extension-version-override`** — use `version-source` with a semver literal instead.
- **Auth is optional** — when `marketplace` is not in `version-source`, no token is required.
- **New output `version-source`** — indicates which source provided the winning version.

### query-version examples

Auto-increment marketplace:

```yaml
- id: version
  uses: jessehouwing/azdo-marketplace@v6
  with:
    operation: query-version
    auth-type: pat
    token: ${{ secrets.MARKETPLACE_PAT }}
    marketplace-version-action: Patch
```

Manifest-only (no auth):

```yaml
- id: version
  uses: jessehouwing/azdo-marketplace@v6
  with:
    operation: query-version
    version-source: manifest
```

Highest-wins with fallback:

```yaml
- id: version
  uses: jessehouwing/azdo-marketplace@v6
  with:
    operation: query-version
    auth-type: pat
    token: ${{ secrets.MARKETPLACE_PAT }}
    marketplace-version-action: Patch
    version-source: |
      marketplace
      1.0.0
```

## Output and variable migration

v5 Azure Pipelines output references typically looked like pipeline variables.
In GitHub Actions, consume step outputs instead:

- package output: `${{ steps.package.outputs.vsix-path }}`
- show output: `${{ steps.show.outputs.metadata }}`
- query version outputs: `${{ steps.version.outputs.proposed-version }}`, `${{ steps.version.outputs.current-version }}`

## Example: v5-style package + publish to GitHub Actions

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

      - id: publish
        uses: jessehouwing/azdo-marketplace@v6
        with:
          operation: publish
          auth-type: oidc
          use: vsix
          vsix-file: ${{ steps.package.outputs.vsix-path }}
```

## Validation checklist

- Triggers and branch filters recreated in workflow `on:` blocks.
- Required PAT scopes (or OIDC permissions) configured.
- Secrets moved from Azure service connections/variable groups to GitHub secrets.
- First publish executed against a safe test extension/tag.
- Optional wait steps added (`wait-for-validation`, `wait-for-installation`).

## Related guides

- [Migrate Azure Pipelines from v5 to v6](./migrate-azure-pipelines-v5-to-v6.md)
- [Migrate Azure Pipelines to GitHub Actions](./migrate-azure-pipelines-to-github-actions.md)
- [v6 in GitHub Actions](./github-actions.md)
