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

- `publisher-id`: Publisher ID
- `extension-id`: Extension ID
- `accounts`: Organizations to share with (newline-separated)
- `token`: Personal Access Token (required when auth-type is `pat`)

OR

- `auth-type: oidc`: Use OIDC authentication (requires `azure/login` action first)

### Optional Inputs

#### Authentication

- `auth-type`: Authentication type (`pat` or `oidc`, default: `pat`)
- `token`: Personal Access Token (required when auth-type is `pat`)

#### TFX Configuration

- `tfx-version`: Version of tfx-cli to use (default: `built-in`)

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

## See Also

- [Unshare](../unshare) - Unshare extension from organizations
- [Publish](../publish) - Publish extension (with share option)
- [Install](../install) - Install extension to accounts
- [Main Action](../) - All-in-one action with all commands
