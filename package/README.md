# Package Azure DevOps Extension

Create a .vsix package file for an Azure DevOps extension from your extension manifest.

## Usage

### Basic Example

```yaml
- uses: jessehouwing/azdo-marketplace/package@v6
  with:
    manifest-file: './my-extension/vss-extension.json'
    output-path: './dist'
```

### With Version Override

```yaml
- uses: jessehouwing/azdo-marketplace/package@v6
  with:
    manifest-file: './my-extension/vss-extension.json'
    extension-version: '1.2.3'
    output-path: './dist'
```

### With Task Version Updates

```yaml
- uses: jessehouwing/azdo-marketplace/package@v6
  with:
    manifest-file: './my-extension/vss-extension.json'
    extension-version: ${{ github.ref_name }}
    update-tasks-version: 'patch'
    output-path: './dist'
```

## Inputs

### Required Inputs

None - all inputs are optional with sensible defaults.

### Optional Inputs

#### Authentication

- `auth-type`: Authentication type (`pat` or `oidc`, default: `pat`)
- `token`: Personal Access Token (not needed for package operation)

#### TFX Configuration

- `tfx-version`: Version of tfx-cli to use (default: `built-in`)
  - `built-in`: Use bundled tfx-cli JS entrypoint (no `node_modules/.bin` shim fallback)
  - `path`: Use `tfx` from system PATH (provided by your environment)
  - `latest`: Download latest version from npm
  - `0.17.x`: Download specific version

#### Extension Identity

- `publisher-id`: Publisher ID from manifest (can override)
- `extension-id`: Extension ID from manifest (can override)

#### Manifest Source

- `manifest-file`: Manifest file path(s), newline-separated (default: `vss-extension.json`)
- `manifest-file-js`: JS manifest module path for tfx `--manifest-js`
- `overrides-file`: JSON overrides file for tfx `--overrides-file` (merged with generated overrides)

#### Metadata Overrides

- `extension-version`: Override extension version
- `extension-name`: Override extension name
- `extension-visibility`: Override visibility (`private`, `public`, `private_preview`, `public_preview`)
- `localization-root`: Localization folder root for `resources.resjson` files
- `extension-pricing`: Override pricing (`default`, `free`, `paid`)

#### Package Options

- `output-path`: Output directory for .vsix file
- `bypass-validation`: Skip extension validation (default: `false`)
- `update-tasks-version`: Task version update mode (`none`, `major`, `minor`, `patch`, default: `none`)
- `update-tasks-id`: Generate deterministic task IDs (default: `false`)

## Outputs

- `vsix-file`: Path to the generated .vsix file

## Example: Complete Workflow

```yaml
name: Package Extension

on:
  push:
    branches: [main]

jobs:
  package:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: jessehouwing/azdo-marketplace/package@v6
        id: package
        with:
          manifest-file: './extension/vss-extension.json'
          extension-version: '1.0.${{ github.run_number }}'
          update-tasks-version: 'patch'
          output-path: './dist'

      - name: Upload VSIX
        uses: actions/upload-artifact@v4
        with:
          name: extension
          path: ${{ steps.package.outputs.vsix-file }}
```

## GitHub Marketplace sample

```yaml
- uses: jessehouwing/azdo-marketplace/package@v6
  id: package
  with:
    publisher-id: my-publisher
    extension-id: my-extension
    manifest-file: vss-extension.json

- run: echo "VSIX: ${{ steps.package.outputs.vsix-file }}"
```

## GitHub Marketplace inputs

- `tfx-version`: Selects which `tfx-cli` version/source is used; `built-in` uses the bundled JS entrypoint without `.bin` shim fallback, `path` uses `tfx` from PATH.
- `publisher-id`: Overrides publisher identity used in packaging.
- `extension-id`: Overrides extension identity used in packaging.
- `manifest-file`: Provides one or more manifest files for package input.
- `manifest-file-js`: Provides a JS manifest module for `tfx --manifest-js`.
- `overrides-file`: Provides an overrides JSON file merged into the packaging manifest.
- `extension-version`: Overrides extension version in the package.
- `extension-name`: Overrides extension display name in the package.
- `extension-visibility`: Overrides marketplace visibility metadata.
- `localization-root`: Points to localization resources included in the package.
- `extension-pricing`: Overrides extension pricing metadata.
- `output-path`: Sets where the generated VSIX file is written.
- `bypass-validation`: Skips validation checks during package creation.
- `update-tasks-version`: Controls task version bump behavior during package generation.
- `update-tasks-id`: Regenerates deterministic task IDs for packaged tasks.

## GitHub Marketplace outputs

- `vsix-file`: Returns the full path to the generated VSIX file.

## See Also

- [Publish](../publish) - Publish extension to marketplace
- [Main Action](../) - All-in-one action with all commands
