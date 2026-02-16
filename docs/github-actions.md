# v6 in GitHub Actions

This repository ships a **unified JavaScript action** and **composite command wrappers**.

- Unified action: `jessehouwing/azure-devops-extension-tasks@refactor/v6`
- Main definition: `action.yml`
- Entry point: `packages/github-action/src/main.ts`

## Minimal usage

```yaml
- uses: jessehouwing/azure-devops-extension-tasks@refactor/v6
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
- `token`: PAT when `auth-type=pat`
- `username` + `password`: when `auth-type=basic`
- `service-url`: optional override for Azure DevOps service URL (required for `wait-for-installation` as `https://dev.azure.com/<organization>`)

### Identity and tooling

- `publisher-id`
- `extension-id`
- `tfx-version`

### Packaging/publish source and overrides

- `root-folder`, `manifest-globs`
- `publish-source` (`manifest` or `vsix`)
- `vsix-file`
- `extension-version`, `extension-name`, `extension-visibility`
- `output-path`
- `bypass-validation`, `rev-version`
- `share-with`, `unshare-with`
- `no-wait-validation`
- `update-tasks-version`, `update-tasks-id`

### Query and wait operations

- `version-action`, `extension-version-override`
- `max-retries`, `min-timeout`, `max-timeout`
- `accounts`
- `expected-tasks`, `manifest-path`, `vsix-path`
- `timeout-minutes`, `polling-interval-seconds`

## Command reference (unified action)

### `package`

- Required:
  - `operation: package`
- Optional:
  - `publisher-id`, `extension-id`
  - `root-folder`, `manifest-globs`
  - `extension-version`, `extension-name`, `extension-visibility`
  - `output-path`
  - `bypass-validation`, `rev-version`, `update-tasks-version`, `update-tasks-id`
  - auth/tooling inputs

### `publish`

- Required:
  - `operation: publish`
  - auth inputs (`auth-type` + credentials)
  - `publish-source`
  - `vsix-file` when `publish-source=vsix`
- Optional:
  - identity inputs
  - manifest inputs
  - metadata override inputs
  - `share-with`, `no-wait-validation`, `update-tasks-version`, `update-tasks-id`

### `unpublish`

- Required:
  - `operation: unpublish`
  - auth inputs
  - `publisher-id`, `extension-id`
- Optional:
  - tooling/service URL overrides

### `share`

- Required:
  - `operation: share`
  - auth inputs
  - `publisher-id`, `extension-id`
  - `share-with`

### `unshare`

- Required:
  - `operation: unshare`
  - auth inputs
  - `publisher-id`, `extension-id`
  - `unshare-with`

### `install`

- Required:
  - `operation: install`
  - auth inputs
  - `publisher-id`, `extension-id`
  - `accounts`
- Optional:
  - `extension-version`

### `show`

- Required:
  - `operation: show`
  - auth inputs
  - `publisher-id`, `extension-id`
- Optional:
  - none

### `query-version`

- Required:
  - `operation: query-version`
  - auth inputs
  - `publisher-id`, `extension-id`
- Optional:
  - `version-action`
  - `extension-version-override`
  - none

### `wait-for-validation`

- Required:
  - `operation: wait-for-validation`
  - auth inputs
  - `publisher-id`, `extension-id`
- Optional:
  - `max-retries`, `min-timeout`, `max-timeout`

### `wait-for-installation`

- Required:
  - `operation: wait-for-installation`
  - auth inputs
  - `service-url: https://dev.azure.com/<organization>` (marketplace URL is rejected)
  - `publisher-id`, `extension-id`
  - `accounts`
- Optional:
  - one of `expected-tasks`, `manifest-path`, `vsix-path`
  - `timeout-minutes`, `polling-interval-seconds`

## Unified action outputs

- `vsix-path` (package)
- `extension-metadata` (show)
- `proposed-version` (query-version)
- `current-version` (query-version)

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
- uses: jessehouwing/azure-devops-extension-tasks/package@v6
  id: package
  with:
    root-folder: .

- run: echo "VSIX: ${{ steps.package.outputs.vsix-path }}"
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
    uses: jessehouwing/azure-devops-extension-tasks@refactor/v6
    with:
      operation: package
      root-folder: .

  - uses: jessehouwing/azure-devops-extension-tasks@refactor/v6
    with:
      operation: publish
      auth-type: oidc
      publish-source: vsix
      vsix-file: ${{ steps.package.outputs.vsix-path }}
```

## OIDC note for GitHub Actions

For `auth-type: oidc`, authenticate to Azure first (for example using `azure/login@v2`) and ensure your federated identity can request a token for resource `499b84ac-1321-427f-aa17-267ca6975798`.
See [authentication-and-oidc.md](./authentication-and-oidc.md) for full setup guidance.
