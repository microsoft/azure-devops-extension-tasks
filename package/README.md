# Package Azure DevOps Extension

Create a .vsix package file for an Azure DevOps extension from your extension manifest.

## Usage

### Basic Example

```yaml
- uses: jessehouwing/azure-devops-extension-tasks/package@v6
  with:
    root-folder: './my-extension'
    output-path: './dist'
```

### With Version Override

```yaml
- uses: jessehouwing/azure-devops-extension-tasks/package@v6
  with:
    root-folder: './my-extension'
    extension-version: '1.2.3'
    output-path: './dist'
```

### With Task Version Updates

```yaml
- uses: jessehouwing/azure-devops-extension-tasks/package@v6
  with:
    root-folder: './my-extension'
    extension-version: ${{ github.ref_name }}
    update-tasks-version: 'true'
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
  - `built-in`: Use bundled tfx-cli
  - `latest`: Download latest version from npm
  - `0.17.x`: Download specific version

#### Extension Identity

- `publisher-id`: Publisher ID from manifest (can override)
- `extension-id`: Extension ID from manifest (can override)

#### Manifest Source

- `root-folder`: Root folder containing extension files (default: current directory)
- `manifest-globs`: Manifest file patterns, newline-separated (default: `vss-extension.json`)

#### Metadata Overrides

- `extension-version`: Override extension version
- `extension-name`: Override extension name
- `extension-visibility`: Override visibility (`private`, `public`, `private_preview`, `public_preview`)

#### Package Options

- `output-path`: Output directory for .vsix file
- `bypass-validation`: Skip extension validation (default: `false`)
- `rev-version`: Auto-increment patch version (default: `false`)
- `update-tasks-version`: Update task versions to match extension version (default: `false`)
- `update-tasks-id`: Generate deterministic task IDs (default: `false`)

## Outputs

- `vsix-path`: Path to the generated .vsix file

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

      - uses: jessehouwing/azure-devops-extension-tasks/package@v6
        id: package
        with:
          root-folder: './extension'
          extension-version: '1.0.${{ github.run_number }}'
          update-tasks-version: 'true'
          output-path: './dist'

      - name: Upload VSIX
        uses: actions/upload-artifact@v4
        with:
          name: extension
          path: ${{ steps.package.outputs.vsix-path }}
```

## See Also

- [Publish](../publish) - Publish extension to marketplace
- [Main Action](../) - All-in-one action with all commands
