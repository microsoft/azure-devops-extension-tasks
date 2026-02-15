# Verify Azure DevOps Extension Installation

Verify that an Azure DevOps extension has been installed correctly and that all expected tasks are available in the specified accounts.

## Usage

### Verify with Manifest

```yaml
- uses: jessehouwing/azure-devops-extension-tasks/verify-install@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: 'myorg'
    manifest-path: './extension/vss-extension.json'
```

### Verify with VSIX

```yaml
- uses: jessehouwing/azure-devops-extension-tasks/verify-install@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: 'myorg'
    vsix-path: './dist/extension.vsix'
```

### Verify with Expected Tasks JSON

```yaml
- uses: jessehouwing/azure-devops-extension-tasks/verify-install@v6
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
- uses: jessehouwing/azure-devops-extension-tasks/verify-install@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: |
      myorg1
      myorg2
      myorg3
    manifest-path: './extension/vss-extension.json'
```

### With Custom Timeout and Polling

```yaml
- uses: jessehouwing/azure-devops-extension-tasks/verify-install@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: 'myorg'
    manifest-path: './extension/vss-extension.json'
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

- uses: jessehouwing/azure-devops-extension-tasks/verify-install@v6
  with:
    auth-type: 'oidc'
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: 'myorg'
    manifest-path: './extension/vss-extension.json'
```

## Inputs

### Required Inputs

- `publisher-id`: Publisher ID
- `extension-id`: Extension ID
- `accounts`: Azure DevOps accounts/organizations (newline-separated)
- `token`: Personal Access Token (required when auth-type is `pat`)

**Plus one of:**
- `expected-tasks`: JSON array of expected tasks
- `manifest-path`: Path to extension manifest
- `vsix-path`: Path to .vsix file

OR

- `auth-type: oidc`: Use OIDC authentication (requires `azure/login` action first)

### Optional Inputs

#### Authentication
- `auth-type`: Authentication type (`pat` or `oidc`, default: `pat`)
- `token`: Personal Access Token (required when auth-type is `pat`)

#### TFX Configuration
- `tfx-version`: Version of tfx-cli to use (default: `built-in`)

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
        uses: jessehouwing/azure-devops-extension-tasks/package@v6
        id: package
        with:
          root-folder: './extension'
          extension-version: ${{ github.ref_name }}
          update-tasks-version: 'true'
      
      - name: Publish Extension
        uses: jessehouwing/azure-devops-extension-tasks/publish@v6
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          publish-source: 'vsix'
          vsix-file: ${{ steps.package.outputs.vsix-path }}
      
      - name: Install to Production Org
        uses: jessehouwing/azure-devops-extension-tasks/install@v6
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          publisher-id: 'my-publisher'
          extension-id: 'my-extension'
          accounts: 'production-org'
      
      - name: Verify Installation
        uses: jessehouwing/azure-devops-extension-tasks/verify-install@v6
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          publisher-id: 'my-publisher'
          extension-id: 'my-extension'
          accounts: 'production-org'
          vsix-path: ${{ steps.package.outputs.vsix-path }}
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

## See Also

- [Install](../install) - Install extension to accounts
- [Is Valid](../is-valid) - Validate extension in marketplace
- [Show](../show) - Display extension metadata
- [Main Action](../) - All-in-one action with all commands
