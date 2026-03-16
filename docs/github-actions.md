# v6 in GitHub Actions

This repository ships a **unified JavaScript action** and **composite command wrappers**.

- Unified action: `jessehouwing/azdo-marketplace@v6`
- Main definition: `action.yml`
- Entry point: `packages/github-action/src/main.ts`

## Minimal usage

```yaml
- uses: jessehouwing/azdo-marketplace@v6
  with:
    operation: package
```

## Supported operations (unified action)

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

## Common inputs

### Authentication

- `auth-type`: `pat` | `basic` | `oidc` (default `pat`)
- `token`: secret token when `auth-type=pat` or `auth-type=basic`
- `username`: required when `auth-type=basic`
- `service-url`: optional override for Azure DevOps service URL (required for `wait-for-installation` as `https://dev.azure.com/<organization>`)

### Identity and tooling

- `publisher-id`
- `extension-id`
- `tfx-version`

### Packaging/publish source and overrides

- `manifest-file`
- `manifest-file-js`
- `overrides-file`
- `use` (`manifest` or `vsix`)
- `vsix-file`
- `extension-version`, `extension-name`, `extension-visibility`
- `output-path`
- `bypass-validation`
- `share-with`, `unshare-with`
- `no-wait-validation`
- `update-tasks-version`, `update-tasks-id`

### Version resolution (query-version)

- `version-source` (newline-separated list of sources: `marketplace`, `manifest`, `vsix`, or semver literals; highest wins)
- `marketplace-version-action` (`None`, `Major`, `Minor`, `Patch`; applies only to the marketplace source)

### Wait operations

- `max-retries`, `min-timeout`, `max-timeout`
- `accounts`
- `expected-tasks`, `manifest-file`, `vsix-file`
- `timeout-minutes`, `polling-interval-seconds`

## Command reference (unified action)

### `package`

- Required:
  - `operation: package`
- Optional:
  - `publisher-id`, `extension-id`
  - `manifest-file`, `manifest-file-js`, `overrides-file`
  - `extension-version`, `extension-name`, `extension-visibility`
  - `output-path`
  - `bypass-validation`, `update-tasks-version`, `update-tasks-id`
  - auth/tooling inputs

### `publish`

- Required:
  - `operation: publish`
  - auth inputs (`auth-type` + credentials)
  - `use`
  - `vsix-file` when `use=vsix`
- Optional:
  - identity inputs
  - manifest inputs (`manifest-file`, `manifest-file-js`, `overrides-file`)
  - metadata override inputs
  - `share-with`, `no-wait-validation`, `update-tasks-version`, `update-tasks-id`

### `unpublish`

- Required:
  - `operation: unpublish`
  - auth inputs
- Optional:
  - `publisher-id`, `extension-id` (can be inferred from `manifest-file` or `vsix-file`)
  - `manifest-file`, `vsix-file`
  - tooling/service URL overrides

### `share`

- Required:
  - `operation: share`
  - auth inputs
  - `share-with`
- Optional:
  - `publisher-id`, `extension-id` (can be inferred from `manifest-file` or `vsix-file`)
  - `manifest-file`, `vsix-file`

### `unshare`

- Required:
  - `operation: unshare`
  - auth inputs
  - `unshare-with`
- Optional:
  - `publisher-id`, `extension-id` (can be inferred from `manifest-file` or `vsix-file`)
  - `manifest-file`, `vsix-file`

### `install`

- Required:
  - `operation: install`
  - auth inputs
  - `accounts`
- Optional:
  - `publisher-id`, `extension-id` (can be inferred from `manifest-file` or `vsix-file`)
  - `manifest-file`, `vsix-file`
  - `extension-version`

### `show`

- Required:
  - `operation: show`
  - auth inputs
  - `publisher-id`, `extension-id`
- Optional:
  - none

### `query-version`

Resolves the proposed extension version from one or more sources. The highest valid semver wins.

- Required:
  - `operation: query-version`
  - `publisher-id`, `extension-id` (or inferred from manifest/VSIX)
- Conditionally required:
  - auth inputs — only when `marketplace` is in `version-source` (default)
- Optional:
  - `version-source` (default: `marketplace`; newline-separated list of `marketplace`, `manifest`, `vsix`, or semver literals)
  - `marketplace-version-action` (`None`, `Major`, `Minor`, `Patch`; only applies to the marketplace source)
  - `use`, `vsix-file`, `manifest-file`

### `wait-for-validation`

- Required:
  - `operation: wait-for-validation`
  - auth inputs
- Optional:
  - `publisher-id`, `extension-id` (can be inferred from `manifest-file` or `vsix-file`)
  - `manifest-file`, `vsix-file`
  - `max-retries`, `min-timeout`, `max-timeout`

### `wait-for-installation`

- Required:
  - `operation: wait-for-installation`
  - auth inputs
  - `accounts`
- Optional:
  - `publisher-id` (if omitted, inferred from `vsix-file` when provided)
  - `extension-id` (if omitted, inferred from `vsix-file` when provided)
  - one of `expected-tasks`, `manifest-file`, `vsix-file`
  - `timeout-minutes`, `polling-interval-seconds`

## Unified action outputs

- `vsix-file` (package)
- `metadata` (show)
- `proposed-version` (query-version) — highest version from all sources
- `current-version` (query-version) — resolved version before increment (from the winning `version-source`)
- `version-source` (query-version) — which source won: `marketplace`, `manifest`, `vsix`, or `literal`

## Status and control flow

GitHub Actions does not use legacy task status outputs such as `published`, `shared`, `unshared`, `installed`, `waitForValidation`, or `waitForInstallation`.

Use built-in status fields for both the unified action and composite wrappers:

- `${{ steps.<step_id>.outcome }}` (`success`, `failure`, `cancelled`, `skipped`)
- `${{ steps.<step_id>.conclusion }}` (especially useful with `continue-on-error`)
- `if: success()`, `if: failure()`, `if: always()`, `if: cancelled()`

## Composite action availability

The repo provides command-focused composite wrappers that internally call the unified action:

- `package/action.yaml`
- `publish/action.yaml`
- `unpublish/action.yaml`
- `share/action.yaml`
- `unshare/action.yaml`
- `install/action.yaml`
- `show/action.yaml`
- `query-version/action.yaml`
- `wait-for-validation/action.yaml`
- `wait-for-installation/action.yaml`

Use these when you prefer a dedicated command surface over setting `operation` manually.

### Example using a composite action

```yaml
- uses: jessehouwing/azdo-marketplace/package@v6
  id: package

- run: echo "VSIX: ${{ steps.package.outputs.vsix-file }}"
```

## Recommended publish example (OIDC)

```yaml
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
      vsix-file: ${{ steps.package.outputs.vsix-file }}
```

## Query-version examples

### Auto-increment marketplace version (default)

```yaml
- id: version
  uses: jessehouwing/azdo-marketplace@v6
  with:
    operation: query-version
    auth-type: pat
    token: ${{ secrets.MARKETPLACE_PAT }}
    marketplace-version-action: Patch
```

### First publish with fallback (marketplace + literal)

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

### Use version from manifest only (no auth required)

```yaml
- id: version
  uses: jessehouwing/azdo-marketplace@v6
  with:
    operation: query-version
    version-source: manifest
```

### GitVersion or external tool integration (no auth required)

```yaml
- id: version
  uses: jessehouwing/azdo-marketplace@v6
  with:
    operation: query-version
    version-source: |
      ${{ steps.gitversion.outputs.semVer }}
```

### Highest-wins across multiple sources

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
      ${{ steps.gitversion.outputs.semVer }}
      manifest
```

Use the output for subsequent steps:

```yaml
- run: echo "Proposed version: ${{ steps.version.outputs.proposed-version }} (from ${{ steps.version.outputs.version-source }})"
```

## OIDC note for GitHub Actions

For `auth-type: oidc`, authenticate to Azure first (for example using `azure/login@v2`) and ensure your federated identity can request a token for resource `499b84ac-1321-427f-aa17-267ca6975798`.
See [authentication-and-oidc.md](./authentication-and-oidc.md) for full setup guidance.
