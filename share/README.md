# Share Azure DevOps Extension

Share an Azure DevOps extension with specific organizations.

## Usage

`accounts` accepts organization names and the URL formats `https://dev.azure.com/ORG` and `https://ORG.visualstudio.com`. URL inputs are normalized to organization names before execution.

### Share with Single Organization

```yaml
- uses: jessehouwing/azdo-marketplace/share@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: 'myorg'
```

### Share with Multiple Organizations

```yaml
- uses: jessehouwing/azdo-marketplace/share@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: |
      myorg1
      myorg2
      myorg3
```

### Share Using VSIX Identity Fallback

```yaml
- uses: jessehouwing/azdo-marketplace/share@v6
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

- uses: jessehouwing/azdo-marketplace/share@v6
  with:
    auth-type: 'oidc'
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: 'myorg'
```

## Inputs

### Required Inputs

- `accounts`: Organizations to share with (newline-separated)
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

## Example: Share on Release

```yaml
name: Share Extension

on:
  release:
    types: [published]

jobs:
  share:
    runs-on: ubuntu-latest
    steps:
      - uses: jessehouwing/azdo-marketplace/share@v6
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          publisher-id: 'my-publisher'
          extension-id: 'my-extension'
          accounts: |
            customer-org-1
            customer-org-2
```

## GitHub Marketplace sample

```yaml
- uses: jessehouwing/azdo-marketplace/share@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: my-publisher
    extension-id: my-extension
    accounts: customer-org
```

## GitHub Marketplace inputs

- `auth-type`: Selects authentication mode (`pat`, `basic`, or `oidc`).
- `token`: Provides PAT/secret token for authenticated share operations.
- `username`: Provides username when `auth-type` is `basic`.
- `service-url`: Overrides the Azure DevOps/Marketplace endpoint.
- `tfx-version`: Selects which `tfx-cli` version/source is used; `built-in` uses the bundled JS entrypoint without `.bin` shim fallback, `path` uses `tfx` from PATH.
- `publisher-id`: Identifies the publisher that owns the extension to share.
- `extension-id`: Identifies the extension to share.
- `vsix-file`: Provides VSIX-based identity fallback when publisher/extension IDs are omitted.
- `accounts`: Lists organizations/accounts that receive extension access.

## GitHub Marketplace outputs

- No outputs: success/failure indicates whether sharing completed.

## See Also

- [Unshare](../unshare) - Unshare extension from organizations
- [Publish](../publish) - Publish extension
- [Install](../install) - Install extension to accounts
- [Main Action](../) - All-in-one action with all commands
