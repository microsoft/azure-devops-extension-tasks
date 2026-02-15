# Show Azure DevOps Extension

Display metadata for an Azure DevOps extension from the Visual Studio Marketplace.

## Usage

### Basic Example

```yaml
- uses: jessehouwing/azure-devops-extension-tasks/show@v6
  id: show
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'

- name: Display metadata
  run: echo '${{ steps.show.outputs.extension-metadata }}'
```

### With Output Variable

```yaml
- uses: jessehouwing/azure-devops-extension-tasks/show@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    output-variable: 'EXTENSION_INFO'
```

### With OIDC Authentication

```yaml
- uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

- uses: jessehouwing/azure-devops-extension-tasks/show@v6
  id: show
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

#### Output Options
- `output-variable`: Name of output variable to store metadata JSON

## Outputs

- `extension-metadata`: Extension metadata as JSON string

## Example: Check Version Before Update

```yaml
name: Check Extension Version

on:
  workflow_dispatch:

jobs:
  check-version:
    runs-on: ubuntu-latest
    steps:
      - uses: jessehouwing/azure-devops-extension-tasks/show@v6
        id: show
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          publisher-id: 'my-publisher'
          extension-id: 'my-extension'
      
      - name: Parse version
        id: version
        run: |
          VERSION=$(echo '${{ steps.show.outputs.extension-metadata }}' | jq -r '.versions[0].version')
          echo "current-version=$VERSION" >> $GITHUB_OUTPUT
      
      - name: Display current version
        run: echo "Current version is ${{ steps.version.outputs.current-version }}"
```

## See Also

- [Publish](../publish) - Publish extension to marketplace
- [Is Valid](../is-valid) - Validate extension
- [Main Action](../) - All-in-one action with all commands
