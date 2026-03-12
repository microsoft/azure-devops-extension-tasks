# Query Azure DevOps Extension Version

Query an extension version from multiple sources and optionally increment it. Supports marketplace, manifest, VSIX, and literal semver values — the highest valid version wins.

## Usage

```yaml
- uses: jessehouwing/azdo-marketplace/query-version@v6
  id: query
  with:
    auth-type: pat
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    marketplace-version-action: 'Patch'

- run: |
    echo "Current version: ${{ steps.query.outputs.current-version }}"
    echo "Proposed version: ${{ steps.query.outputs.proposed-version }}"
    echo "Version source: ${{ steps.query.outputs.version-source }}"
```

## Version Sources

Use `version-source` (newline-separated) to specify where versions come from. The highest valid semver wins.

- `marketplace` (default): Query the current marketplace version
- `manifest`: Read version from `vss-extension.json`
- `vsix`: Read version from a VSIX file
- A semver literal (e.g. `1.0.0`)
- Anything else is skipped (handles empty expressions, unresolved variables)

When `marketplace` is not listed, authentication is not required.

## Marketplace Version Action

Only applies when `marketplace` is listed in `version-source`.

- `None` (default): Use the current marketplace version as-is
- `Major`: Increment major and reset minor/patch
- `Minor`: Increment minor and reset patch
- `Patch`: Increment patch

**Example:** If the latest marketplace version is `1.2.3` and action is `Minor`, the result is `1.3.0`.

## Outputs

- `proposed-version`: The highest version from all sources after applying any version action.
- `current-version`: The winning version before applying any increment.
- `version-source`: The source that provided the winning version (`marketplace`, `manifest`, `vsix`, or `literal`).

## Examples

### Auto-increment marketplace version (default behavior)

```yaml
- uses: jessehouwing/azdo-marketplace/query-version@v6
  id: query
  with:
    auth-type: pat
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: my-publisher
    extension-id: my-extension
    marketplace-version-action: Patch
```

### First publish with fallback

```yaml
- uses: jessehouwing/azdo-marketplace/query-version@v6
  id: query
  with:
    auth-type: pat
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: my-publisher
    extension-id: my-extension
    marketplace-version-action: Patch
    version-source: |
      marketplace
      1.0.0
```

### Use version from manifest only (no auth required)

```yaml
- uses: jessehouwing/azdo-marketplace/query-version@v6
  id: query
  with:
    version-source: manifest
```

### GitVersion integration (no auth required)

```yaml
- uses: jessehouwing/azdo-marketplace/query-version@v6
  id: query
  with:
    version-source: |
      ${{ steps.gitversion.outputs.semVer }}
```

### Highest-wins across multiple sources

```yaml
- uses: jessehouwing/azdo-marketplace/query-version@v6
  id: query
  with:
    auth-type: pat
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    marketplace-version-action: Patch
    version-source: |
      marketplace
      ${{ steps.gitversion.outputs.semVer }}
      manifest
```

### Using OIDC authentication

```yaml
- uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

- uses: jessehouwing/azdo-marketplace/query-version@v6
  id: query
  with:
    auth-type: oidc
    publisher-id: my-publisher
    extension-id: my-extension
    marketplace-version-action: Patch
```

## Inputs

- `auth-type`: Authentication mode (`pat`, `basic`, or `oidc`). Default: `pat`.
- `token`: PAT or secret token. Required when `auth-type` is `pat` or `basic`.
- `username`: Username for `basic` authentication.
- `service-url`: Custom Azure DevOps/Marketplace endpoint URL.
- `tfx-version`: tfx-cli version/source (`built-in`, `path`, or version spec). Default: `built-in`.
- `publisher-id`: Publisher that owns the extension.
- `extension-id`: Extension to query.
- `version-source`: Version sources to consider (newline-separated). Default: `marketplace`.
- `marketplace-version-action`: Version increment strategy (`None`, `Major`, `Minor`, `Patch`). Default: `None`.
- `manifest-file`: Manifest file path(s) for reading publisher/extension IDs.
- `use`: Input source (`manifest` or `vsix`).
- `vsix-file`: Path to pre-built `.vsix` file when `use` is `vsix`.

## See Also

- [Show](../show) - Query full extension metadata
- [Publish](../publish) - Publish extension
- [Main Action](../) - All-in-one action
