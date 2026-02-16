# Publish Azure DevOps Extension

Publish an Azure DevOps extension to the Visual Studio Marketplace.

## Usage

### Publish from Manifest

```yaml
- uses: jessehouwing/azure-devops-extension-tasks/publish@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    root-folder: './my-extension'
```

### Publish from VSIX

```yaml
- uses: jessehouwing/azure-devops-extension-tasks/publish@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publish-source: 'vsix'
    vsix-file: './dist/my-extension.vsix'
```

### Publish with OIDC Authentication

```yaml
- uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

- uses: jessehouwing/azure-devops-extension-tasks/publish@v6
  with:
    auth-type: 'oidc'
    root-folder: './my-extension'
```

### Publish with Basic Authentication (On-Premises)

```yaml
- uses: jessehouwing/azure-devops-extension-tasks/publish@v6
  with:
    auth-type: 'basic'
    username: ${{ secrets.TFS_USERNAME }}
    password: ${{ secrets.TFS_PASSWORD }}
    service-url: 'https://myserver.com/tfs'
    root-folder: './my-extension'
```

### Publish with Version Override and Task Updates

```yaml
- uses: jessehouwing/azure-devops-extension-tasks/publish@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publish-source: 'vsix'
    vsix-file: './extension.vsix'
    extension-version: '2.0.0'
    update-tasks-version: 'true'
    update-tasks-id: 'true'
```

## Inputs

### Required Inputs

- `token`: Personal Access Token (required when auth-type is `pat`)

OR

- `auth-type: oidc`: Use OIDC authentication (requires `azure/login` action first)

### Optional Inputs

#### Authentication

- `auth-type`: Authentication type (`pat`, `basic`, or `oidc`, default: `pat`)
- `token`: Personal Access Token (required when auth-type is `pat`)
- `username`: Username for basic authentication (required when auth-type is `basic`)
- `password`: Password for basic authentication (required when auth-type is `basic`)
- `service-url`: Azure DevOps service URL (optional, for on-premises servers)

#### TFX Configuration

- `tfx-version`: Version of tfx-cli to use (default: `built-in`)

#### Extension Identity

- `publisher-id`: Publisher ID (default: from manifest)
- `extension-id`: Extension ID (default: from manifest)

#### Source Selection

- `publish-source`: Source type (`manifest` or `vsix`, default: `manifest`)

#### Manifest Source (when publish-source is manifest)

- `root-folder`: Root folder containing extension files
- `manifest-globs`: Manifest file patterns, newline-separated

#### VSIX Source (when publish-source is vsix)

- `vsix-file`: Path to .vsix file

#### Metadata Overrides

- `extension-version`: Override extension version
- `extension-name`: Override extension name
- `extension-visibility`: Override visibility (`private`, `public`, `private_preview`, `public_preview`)

#### Publish Options

- `no-wait-validation`: Don't wait for validation (default: `false`)
- `update-tasks-version`: Update task versions to match extension version (default: `false`)
- `update-tasks-id`: Generate deterministic task IDs (default: `false`)

## Outputs

None

## Example: Complete CI/CD Pipeline

```yaml
name: Publish Extension

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Publish to Marketplace
        uses: jessehouwing/azure-devops-extension-tasks/publish@v6
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          root-folder: './extension'
          extension-version: ${{ github.ref_name }}
          extension-visibility: 'public'
          update-tasks-version: 'true'
```

## See Also

- [Package](../package) - Create extension package
- [Unpublish](../unpublish) - Remove extension from marketplace
- [Main Action](../) - All-in-one action with all commands
