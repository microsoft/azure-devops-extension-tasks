# Verify Azure DevOps Extension Installation

Verify that an Azure DevOps extension has been installed correctly and that all expected tasks are available in the specified accounts.

`wait-for-installation` does not take a `service-url` input. The action iterates each `accounts` entry and verifies task availability against that account URL.

`accounts` input formats:

- Azure DevOps Services org name: `ORG` (automatically expanded to `https://dev.azure.com/ORG`)
- Azure DevOps Services URL: `https://dev.azure.com/ORG`
- Azure DevOps Server/TFS: provide the full collection URL (for example `https://myserver/tfs/DefaultCollection`)

## Usage

### Verify with Manifest

```yaml
- uses: jessehouwing/azdo-marketplace/wait-for-installation@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: 'myorg'
    manifest-file: './extension/vss-extension.json'
```

### Verify with VSIX

```yaml
- uses: jessehouwing/azdo-marketplace/wait-for-installation@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    accounts: 'myorg'
    vsix-file: './dist/extension.vsix'
```

### Verify with Expected Tasks JSON

```yaml
- uses: jessehouwing/azdo-marketplace/wait-for-installation@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: 'myorg'
    expected-tasks: |
      [
        {"name": "MyTask", "versions": ["1.0.0", "2.0.0"]},
        {"name": "AnotherTask", "versions": ["1.5.0"]}
      ]
```

### Verify Multiple Accounts

```yaml
- uses: jessehouwing/azdo-marketplace/wait-for-installation@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: |
      myorg1
      myorg2
      myorg3
    manifest-file: './extension/vss-extension.json'
```

### With Custom Timeout and Polling

```yaml
- uses: jessehouwing/azdo-marketplace/wait-for-installation@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: 'myorg'
    manifest-file: './extension/vss-extension.json'
    timeout-minutes: '15'
    polling-interval-seconds: '60'
```

### With OIDC Authentication

```yaml
- uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

- uses: jessehouwing/azdo-marketplace/wait-for-installation@v6
  with:
    auth-type: 'oidc'
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: 'myorg'
    manifest-file: './extension/vss-extension.json'
```

## Inputs

### Required Inputs

- `accounts`: Azure DevOps accounts/organizations (newline-separated)
- `token`: Personal Access Token (required when auth-type is `pat`)

Identity inputs:

- `publisher-id`: Publisher ID (optional when `vsix-file` is provided)
- `extension-id`: Extension ID (optional when `vsix-file` is provided)

**Plus one of:**

- `expected-tasks`: JSON array of expected tasks
- `manifest-file`: Extension manifest path(s), newline-separated
- `vsix-file`: Path to .vsix file

OR

- `auth-type: oidc`: Use OIDC authentication (requires `azure/login` action first)

### Optional Inputs

#### Authentication

- `auth-type`: Authentication type (`pat` or `oidc`, default: `pat`)
- `token`: Personal Access Token (required when auth-type is `pat`)

#### TFX Configuration

- `tfx-version`: Version of tfx-cli to use (default: `built-in`; bundled JS entrypoint, no `.bin` shim fallback)

#### Verification Options

- `timeout-minutes`: Timeout for verification in minutes (default: `10`)
- `polling-interval-seconds`: Polling interval in seconds (default: `30`)

## Outputs

None - Action succeeds if all expected tasks are installed, fails otherwise.

## Example: Complete Deployment Pipeline

```yaml
name: Deploy Extension

on:
  release:
    types: [published]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Package Extension
        uses: jessehouwing/azdo-marketplace/package@v6
        id: package
        with:
          manifest-file: './extension/vss-extension.json'
          extension-version: ${{ github.ref_name }}
          update-tasks-version: 'patch'

      - name: Publish Extension
        uses: jessehouwing/azdo-marketplace/publish@v6
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          use: 'vsix'
          vsix-file: ${{ steps.package.outputs.vsix-file }}

      - name: Install to Production Org
        uses: jessehouwing/azdo-marketplace/install@v6
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          publisher-id: 'my-publisher'
          extension-id: 'my-extension'
          accounts: 'production-org'

      - name: Verify Installation
        uses: jessehouwing/azdo-marketplace/wait-for-installation@v6
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          publisher-id: 'my-publisher'
          extension-id: 'my-extension'
          accounts: 'production-org'
          vsix-file: ${{ steps.package.outputs.vsix-file }}
          timeout-minutes: '15'
```

## How It Works

This action polls the Azure DevOps API to verify that:

1. The extension is installed in the specified account(s)
2. All expected tasks are available
3. Task versions match expectations

The verification uses polling with configurable timeout and interval settings to allow time for installation to complete.

## Expected Tasks Format

When using `expected-tasks`, provide a JSON array:

```json
[
  {
    "name": "TaskName",
    "versions": ["1.0.0", "2.0.0"]
  }
]
```

Each task can have multiple versions. The verification succeeds if ALL specified versions are found.

## GitHub Marketplace sample

```yaml
- uses: jessehouwing/azdo-marketplace/wait-for-installation@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: my-publisher
    extension-id: my-extension
    accounts: myorg
    manifest-file: vss-extension.json
```

## GitHub Marketplace inputs

- `auth-type`: Selects authentication mode (`pat`, `basic`, or `oidc`).
- `token`: Provides PAT/secret token for authenticated verification operations.
- `username`: Provides username when `auth-type` is `basic`.
- `tfx-version`: Selects which `tfx-cli` version/source is used; `built-in` uses the bundled JS entrypoint without `.bin` shim fallback, `path` uses `tfx` from PATH.
- `publisher-id`: Identifies the publisher that owns the extension to verify.
- `extension-id`: Identifies the extension to verify.
- `accounts`: Lists organizations/accounts where installation is verified.
- `expected-tasks`: Supplies explicit JSON task/version expectations.
- `manifest-file`: Supplies manifest file(s) for task expectation discovery.
- `vsix-file`: Supplies a VSIX path for task expectation and identity discovery.
- `timeout-minutes`: Sets total verification timeout window.
- `polling-interval-seconds`: Sets interval between installation checks.

## GitHub Marketplace outputs

- No outputs: success/failure indicates whether expected tasks were detected.

## See Also

- [Install](../install) - Install extension to accounts
- [Wait for Validation](../wait-for-validation) - Validate extension in marketplace
- [Show](../show) - Display extension metadata
- [Main Action](../) - All-in-one action with all commands
