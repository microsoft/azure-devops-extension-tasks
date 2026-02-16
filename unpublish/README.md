# Unpublish Azure DevOps Extension

Remove an Azure DevOps extension from the Visual Studio Marketplace.

⚠️ **Warning**: This action permanently removes your extension from the marketplace. Use with caution!

## Usage

### Basic Example

```yaml
- uses: jessehouwing/azdo-marketplace/unpublish@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
```

### With OIDC Authentication

```yaml
- uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

- uses: jessehouwing/azdo-marketplace/unpublish@v6
  with:
    auth-type: 'oidc'
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
```

## Inputs

### Required Inputs

- `publisher-id`: Publisher ID
- `extension-id`: Extension ID
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

## Example: Unpublish on Manual Trigger

```yaml
name: Unpublish Extension

on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Type "UNPUBLISH" to confirm'
        required: true

jobs:
  unpublish:
    runs-on: ubuntu-latest
    if: github.event.inputs.confirm == 'UNPUBLISH'
    steps:
      - uses: jessehouwing/azdo-marketplace/unpublish@v6
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          publisher-id: 'my-publisher'
          extension-id: 'my-extension'
```

## See Also

- [Publish](../publish) - Publish extension to marketplace
- [Main Action](../) - All-in-one action with all commands
