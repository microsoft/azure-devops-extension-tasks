# Query Azure DevOps Extension Version

Query an extension version from Visual Studio Marketplace and optionally increment it.

## Usage

```yaml
- uses: jessehouwing/azure-devops-extension-tasks/query-version@v6
  id: query
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: 'my-publisher'
    extension-id: 'my-extension'
    version-action: 'Patch'

- run: |
  echo "Current version: ${{ steps.query.outputs.current-version }}"
  echo "Proposed version: ${{ steps.query.outputs.proposed-version }}"
```

## Version Actions

- `None`: Keep the latest marketplace version
- `Major`: Increment major and reset minor/patch
- `Minor`: Increment minor and reset patch
- `Patch`: Increment patch

## Override Behavior

Use `extension-version-override` to point to an env var that contains a version. If present, that value is used instead of marketplace query.

## Outputs

- `current-version`: Current marketplace version before version action
- `proposed-version`: Proposed version after applying version action

## See Also

- [Show](../show) - Query full extension metadata
- [Publish](../publish) - Publish extension
- [Main Action](../) - All-in-one action
