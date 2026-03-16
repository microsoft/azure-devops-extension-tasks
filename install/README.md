# Install Azure DevOps Extension

Install an Azure DevOps extension to specific accounts/organizations.

## Usage

`install` does not take a `service-url` input. The action iterates each `accounts` entry and invokes `tfx extension install` with that account URL passed to `--service-url`.

`accounts` input formats:

- Azure DevOps Services org name: `ORG` (automatically expanded to `https://dev.azure.com/ORG`)
- Azure DevOps Services URL: `https://dev.azure.com/ORG`
- Azure DevOps Server/TFS: provide the full collection URL (for example `https://myserver/tfs/DefaultCollection`)

### Install to Single Account

```yaml
- uses: jessehouwing/azdo-marketplace/install@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: 'myorg'
```

### Install to Multiple Accounts

```yaml
- uses: jessehouwing/azdo-marketplace/install@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: |
      myorg1
      myorg2
      myorg3
```

### Install Using VSIX Identity Fallback

```yaml
- uses: jessehouwing/azdo-marketplace/install@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    vsix-file: ${{ steps.package.outputs.vsix-file }}
    accounts: |
      myorg1
      myorg2
```

### With OIDC Authentication

```yaml
- uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

- uses: jessehouwing/azdo-marketplace/install@v6
  with:
    auth-type: 'oidc'
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: 'myorg'
```

## Inputs

### Required Inputs

- `accounts`: Azure DevOps accounts/organizations (newline-separated)
- `token`: Personal Access Token (required when auth-type is `pat`)

Identity (choose one):

- `publisher-id` + `extension-id`
- `vsix-file` (fallback source for identity metadata)

OR

- `auth-type: oidc`: Use OIDC authentication (requires `azure/login` action first)

### Optional Inputs

#### Authentication

- `auth-type`: Authentication type (`pat` or `oidc`, default: `pat`)
- `token`: Personal Access Token (required when auth-type is `pat`)

#### TFX Configuration

- `tfx-version`: Version of tfx-cli to use (default: `built-in`)

#### Identity Fallback

- `vsix-file`: Path to VSIX file used to infer `publisher-id` and `extension-id` when omitted

## Outputs

None

## Example: Install After Publishing

```yaml
name: Publish and Install Extension

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Publish Extension
        uses: jessehouwing/azdo-marketplace/publish@v6
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          manifest-file: './extension/vss-extension.json'
          extension-version: '1.0.${{ github.run_number }}'

      - name: Install to Test Org
        uses: jessehouwing/azdo-marketplace/install@v6
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          publisher-id: 'my-publisher'
          extension-id: 'my-extension'
          accounts: 'test-org'
```

## GitHub Marketplace sample

```yaml
- uses: jessehouwing/azdo-marketplace/install@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: my-publisher
    extension-id: my-extension
    accounts: myorg
```

## GitHub Marketplace inputs

- `auth-type`: Selects authentication mode (`pat`, `basic`, or `oidc`).
- `token`: Provides PAT/secret token for authenticated install operations.
- `username`: Provides username when `auth-type` is `basic`.
- `tfx-version`: Selects which `tfx-cli` version/source is used; `built-in` uses the bundled JS entrypoint without `.bin` shim fallback, `path` uses `tfx` from PATH.
- `publisher-id`: Identifies the publisher that owns the extension to install.
- `extension-id`: Identifies the extension to install.
- `vsix-file`: Provides VSIX-based identity fallback when publisher/extension IDs are omitted.
- `accounts`: Lists target organizations/accounts where the extension is installed.

## GitHub Marketplace outputs

- No outputs: success/failure indicates whether install completed.

## See Also

- [Wait for Installation](../wait-for-installation) - Verify extension installation
- [Share](../share) - Share extension before installing
- [Main Action](../) - All-in-one action with all commands
