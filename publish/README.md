# Publish Azure DevOps Extension

Publish an Azure DevOps extension to the Visual Studio Marketplace.

## Usage

### Publish from Manifest

```yaml
- uses: jessehouwing/azdo-marketplace/publish@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    manifest-file: './my-extension/vss-extension.json'
```

### Publish from VSIX

```yaml
- uses: jessehouwing/azdo-marketplace/publish@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    use: 'vsix'
    vsix-file: './dist/my-extension.vsix'
```

### Publish with OIDC Authentication

```yaml
- uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

- uses: jessehouwing/azdo-marketplace/publish@v6
  with:
    auth-type: 'oidc'
    manifest-file: './my-extension/vss-extension.json'
```

### Publish with Basic Authentication (On-Premises)

```yaml
- uses: jessehouwing/azdo-marketplace/publish@v6
  with:
    auth-type: 'basic'
    username: ${{ secrets.TFS_USERNAME }}
    token: ${{ secrets.TFS_TOKEN }}
    service-url: 'https://myserver.com/tfs'
    manifest-file: './my-extension/vss-extension.json'
```

### Publish with Version Override and Task Updates

```yaml
- uses: jessehouwing/azdo-marketplace/publish@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    manifest-file: './my-extension/vss-extension.json'
    extension-version: '2.0.0'
    update-tasks-version: 'minor'
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
- `token`: Secret token (PAT for `pat`, basic credential secret for `basic`; required for both)
- `username`: Username for basic authentication (required when auth-type is `basic`)
- `service-url`: Azure DevOps service URL (optional, for on-premises servers)

#### TFX Configuration

- `tfx-version`: Version of tfx-cli to use (default: `built-in`)

#### Extension Identity

- `publisher-id`: Publisher ID (default: from manifest)
- `extension-id`: Extension ID (default: from manifest)

#### Source Selection

- `use`: Source type (`manifest` or `vsix`, default: `manifest`)

#### Manifest Source (when use is manifest)

- `manifest-file`: Manifest file path(s), newline-separated
- `manifest-file-js`: JS manifest module path for tfx `--manifest-js`
- `overrides-file`: JSON overrides file for tfx `--overrides-file` (merged with generated overrides)

#### VSIX Source (when use is vsix)

- `vsix-file`: Path to .vsix file

#### Metadata Overrides

- `extension-version`: Override extension version
- `extension-name`: Override extension name
- `extension-visibility`: Override visibility (`private`, `public`, `private_preview`, `public_preview`)
- `localization-root`: Localization folder root for `resources.resjson` files (manifest source)
- `extension-pricing`: Override pricing (`default`, `free`, `paid`)
- `output-path`: Output directory for the generated/final `.vsix` used during publish

#### Publish Options

- `no-wait-validation`: Don't wait for validation (default: `false`)
- `update-tasks-version`: Task version update mode (`none`, `major`, `minor`, `patch`, default: `none`)
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
        uses: jessehouwing/azdo-marketplace/publish@v6
        with:
          token: ${{ secrets.MARKETPLACE_TOKEN }}
          manifest-file: './extension/vss-extension.json'
          extension-version: ${{ github.ref_name }}
          extension-visibility: 'public'
          update-tasks-version: 'major'
```

## GitHub Marketplace sample

```yaml
- uses: jessehouwing/azdo-marketplace/publish@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: my-publisher
    extension-id: my-extension
    manifest-file: vss-extension.json
```

## GitHub Marketplace inputs

- `auth-type`: Selects authentication mode (`pat`, `basic`, or `oidc`).
- `token`: Provides PAT/secret token for authenticated publish operations.
- `username`: Provides username when `auth-type` is `basic`.
- `service-url`: Overrides the service endpoint for cloud/on-prem publish.
- `tfx-version`: Selects which `tfx-cli` version/source is used; `built-in` uses the bundled JS entrypoint without `.bin` shim fallback, `path` uses `tfx` from PATH.
- `publisher-id`: Overrides publisher identity used for publish.
- `extension-id`: Overrides extension identity used for publish.
- `use`: Chooses publish source (`manifest` or `vsix`).
- `manifest-file`: Provides one or more manifest files for manifest publishing.
- `manifest-file-js`: Provides a JS manifest module for `tfx --manifest-js`.
- `overrides-file`: Provides an overrides JSON file merged into manifest publishing.
- `vsix-file`: Provides the VSIX path when publishing from VSIX source.
- `extension-version`: Overrides extension version before publish.
- `extension-name`: Overrides extension display name before publish.
- `extension-visibility`: Overrides marketplace visibility metadata.
- `localization-root`: Points to localization resources included while publishing.
- `extension-pricing`: Overrides extension pricing metadata.
- `output-path`: Sets where the generated/final VSIX file is written.
- `no-wait-validation`: Publishes without waiting for marketplace validation.
- `update-tasks-version`: Controls task version bump behavior before publish.
- `update-tasks-id`: Regenerates deterministic task IDs for publish variants.

## GitHub Marketplace outputs

- `vsix-file`: Returns the generated/final VSIX path produced during publish.

## See Also

- [Package](../package) - Create extension package
- [Unpublish](../unpublish) - Remove extension from marketplace
- [Main Action](../) - All-in-one action with all commands
