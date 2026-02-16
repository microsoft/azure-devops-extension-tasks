# Unshare Azure DevOps Extension

Unshare an Azure DevOps extension from specific organizations.

## Usage

`accounts` accepts organization names and the URL formats `https://dev.azure.com/ORG` and `https://ORG.visualstudio.com`. URL inputs are normalized to organization names before execution.

### Unshare from Single Organization

```yaml
- uses: jessehouwing/azdo-marketplace/unshare@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: 'old-org'
```

### Unshare from Multiple Organizations

```yaml
- uses: jessehouwing/azdo-marketplace/unshare@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: |
      old-org-1
      old-org-2
      old-org-3
```

### With OIDC Authentication

```yaml
- uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

- uses: jessehouwing/azdo-marketplace/unshare@v6
  with:
    auth-type: 'oidc'
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    accounts: 'old-org'
```

## Inputs

### Required Inputs

- `publisher-id`: Publisher ID
- `extension-id`: Extension ID
- `accounts`: Organizations to unshare from (newline-separated)
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

## Example: Unshare on Workflow Dispatch

```yaml
name: Unshare Extension

on:
  workflow_dispatch:
    inputs:
      organization:
        description: 'Organization to unshare from'
        required: true

jobs:
  unshare:
    runs-on: ubuntu-latest
    steps:
      - uses: jessehouwing/azdo-marketplace/unshare@v6
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          publisher-id: 'my-publisher'
          extension-id: 'my-extension'
          accounts: ${{ github.event.inputs.organization }}
```

## See Also

- [Share](../share) - Share extension with organizations
- [Main Action](../) - All-in-one action with all commands
