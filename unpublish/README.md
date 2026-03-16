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

### Unpublish Using VSIX Identity Fallback

```yaml
- uses: jessehouwing/azdo-marketplace/unpublish@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    vsix-file: ${{ steps.package.outputs.vsix-file }}
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

- `tfx-version`: Version of tfx-cli to use (default: `built-in`; bundled JS entrypoint, no `.bin` shim fallback)

#### Identity Fallback

- `vsix-file`: Path to VSIX file used to infer `publisher-id` and `extension-id` when omitted

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

## GitHub Marketplace sample

```yaml
- uses: jessehouwing/azdo-marketplace/unpublish@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: my-publisher
    extension-id: my-extension
```

## GitHub Marketplace inputs

- `auth-type`: Selects authentication mode (`pat`, `basic`, or `oidc`).
- `token`: Provides PAT/secret token for authenticated unpublish operations.
- `username`: Provides username when `auth-type` is `basic`.
- `service-url`: Overrides the Azure DevOps/Marketplace endpoint.
- `tfx-version`: Selects which `tfx-cli` version/source is used; `built-in` uses the bundled JS entrypoint without `.bin` shim fallback, `path` uses `tfx` from PATH.
- `publisher-id`: Identifies the publisher that owns the extension to unpublish.
- `extension-id`: Identifies the extension to unpublish.
- `vsix-file`: Provides VSIX-based identity fallback when publisher/extension IDs are omitted.

## GitHub Marketplace outputs

- No outputs: success/failure indicates whether unpublish completed.

## See Also

- [Publish](../publish) - Publish extension to marketplace
- [Main Action](../) - All-in-one action with all commands
