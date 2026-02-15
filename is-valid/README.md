# Validate Azure DevOps Extension (is-valid)

Validate that an Azure DevOps extension has been successfully processed by the marketplace.

## Usage

### Basic Validation

```yaml
- uses: jessehouwing/azure-devops-extension-tasks/is-valid@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
```

### With Custom Retry Settings

```yaml
- uses: jessehouwing/azure-devops-extension-tasks/is-valid@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    max-retries: '20'
    min-timeout: '2'
    max-timeout: '30'
```

### With OIDC Authentication

```yaml
- uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

- uses: jessehouwing/azure-devops-extension-tasks/is-valid@v6
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

#### Validation Options
- `max-retries`: Maximum retry attempts (default: `10`)
- `min-timeout`: Minimum timeout between retries in minutes (default: `1`)
- `max-timeout`: Maximum timeout between retries in minutes (default: `15`)

## Outputs

None - Action succeeds if extension is valid, fails otherwise.

## Example: Validate After Publishing

```yaml
name: Publish and Validate Extension

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Publish Extension
        uses: jessehouwing/azure-devops-extension-tasks/publish@v6
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          root-folder: './extension'
      
      - name: Validate Extension
        uses: jessehouwing/azure-devops-extension-tasks/is-valid@v6
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          publisher-id: 'my-publisher'
          extension-id: 'my-extension'
          max-retries: '15'
```

## How It Works

This action polls the marketplace to check if your extension has been successfully validated after publishing. The marketplace validation process can take several minutes, so the action uses exponential backoff with configurable retry settings.

**Retry Logic**:
- Starts with minimum timeout
- Increases timeout exponentially on each retry
- Caps at maximum timeout
- Stops after max-retries attempts

## See Also

- [Publish](../publish) - Publish extension (use with no-wait-validation)
- [Verify Install](../verify-install) - Verify extension installation
- [Show](../show) - Display extension metadata
- [Main Action](../) - All-in-one action with all commands
