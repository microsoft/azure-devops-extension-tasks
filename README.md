# Azdo Marketplace Action & Tasks

This repository hosts GitHub Actions and Azure Pipelines tasks to package, publish, and manage Azure DevOps extensions in the [Visual Studio Marketplace](https://marketplace.visualstudio.com).

## Available commands

- **Package**: Package an Azure DevOps extension into a `.vsix` file.
- **Publish**: Optionally package and publish an extension to the Visual Studio Marketplace.
- **Unpublish**: Remove an extension from the Visual Studio Marketplace.
- **Share**: Share an extension with an Azure DevOps organization.
- **Unshare**: Remove sharing for an extension from one or more Azure DevOps organizations.
- **Install**: Install an extension into an Azure DevOps organization.
- **Show**: Query extension metadata from the marketplace.
- **Query version**: Query the current extension version and optionally increment it.
- **Wait for validation**: Wait for Marketplace validation to finish.
- **Wait for installation**: Wait until extension tasks are available in target organizations.

## Documentation

- [v6 docs index](./docs/README.md)
- [Using v6 in Azure Pipelines](./docs/azure-pipelines.md)
- [Using v6 in GitHub Actions](./docs/github-actions.md)
- [Authentication and OIDC](./docs/authentication-and-oidc.md)
- [Design and architecture](./docs/design-and-architecture.md)
- [Contributing guide](./docs/contributing.md)
- [Migrate Azure Pipelines from v5 to v6](./docs/migrate-azure-pipelines-v5-to-v6.md)
- [Migrate Azure Pipelines to GitHub Actions](./docs/migrate-azure-pipelines-v6-to-github-actions.md)
- [Migrate Azure Pipelines v5 to GitHub Actions](./docs/migrate-azure-pipelines-v5-to-github-actions.md)

### Required scopes

When creating a PAT for pipeline automation, include at least the following scopes:

- **Publish**: `Marketplace (publish)`
- **Unpublish**: `Marketplace (manage)`
- **Share**: `Marketplace (publish)`
- **Unshare**: `Marketplace (publish)`
- **Install**: `Extensions (read and manage)`, `Marketplace (acquire)`
- **Show**: `Marketplace (read)`
- **Query version**: `Marketplace (read)`
- **Wait for validation**: `Marketplace (read)`
- **Wait for installation**: `Extensions (read and manage)`, `Agent Pools (read)`

![Permissions](./Metadata/Images/permissions.png)

## GitHub Marketplace sample (main action)

```yaml
- uses: jessehouwing/azdo-marketplace@v6
  id: publish
  with:
    operation: publish
    auth-type: pat
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: my-publisher
    extension-id: my-extension
    manifest-file: vss-extension.json

- run: echo "VSIX: ${{ steps.publish.outputs.vsix-path }}"
```

### Main action inputs

- `operation`: Selects which command to run (`package`, `publish`, `install`, `share`, `unshare`, `unpublish`, `show`, `query-version`, `wait-for-validation`, `wait-for-installation`).
- `auth-type`: Chooses authentication mode (`pat`, `basic`, `oidc`) for authenticated operations.
- `token`: Provides the secret token used for `pat` and `basic` authentication.
- `username`: Provides the username when `auth-type` is `basic`.
- `service-url`: Overrides the Azure DevOps/Marketplace endpoint for supported operations.
- `tfx-version`: Selects the `tfx-cli` source (`built-in`, `path`, or npm version spec); `built-in` uses the bundled JS entrypoint, while `path` uses `tfx` from PATH.
- `publisher-id`: Sets or overrides the extension publisher identifier (required for `show`, optional for `install`/`share`/`unshare`/`unpublish`/`wait-for-validation`/`query-version` when inferred from manifest or VSIX inputs).
- `extension-id`: Sets or overrides the extension identifier inside the publisher namespace (required for `show`, optional for `install`/`share`/`unshare`/`unpublish`/`wait-for-validation`/`query-version` when inferred from manifest or VSIX inputs).
- `manifest-file`: Points to one or more manifest files used for manifest-based operations and identity fallback in install/share/unshare/unpublish/wait-for-validation/query-version.
- `manifest-file-js`: Points to a JS manifest module for `tfx --manifest-js`.
- `overrides-file`: Points to an overrides JSON file merged into manifest packaging/publishing.
- `vsix-file`: Points to a pre-built VSIX file when publishing from VSIX source.
- `use`: Chooses publish input source (`manifest` or `vsix`).
- `extension-version`: Overrides extension version during package/publish/validation flows.
- `extension-name`: Overrides extension display name during package/publish.
- `extension-visibility`: Overrides marketplace visibility (`private`, `public`, preview variants).
- `localization-root`: Points to localization resources for package/publish.
- `extension-pricing`: Overrides pricing behavior (`default`, `free`, `paid`).
- `output-path`: Sets where generated VSIX files are written.
- `bypass-validation`: Skips package-time validation checks.
- `no-wait-validation`: Skips waiting for marketplace validation after publish.
- `update-tasks-version`: Controls task version update strategy (`none`, `major`, `minor`, `patch`).
- `update-tasks-id`: Regenerates deterministic task IDs for extension variants.
- `accounts`: Provides newline-separated Azure DevOps organizations for install/share/unshare/verification operations.
- `max-retries`: Sets maximum validation retry attempts for `wait-for-validation`.
- `min-timeout`: Sets minimum retry delay (minutes) for `wait-for-validation`.
- `max-timeout`: Sets maximum retry delay (minutes) for `wait-for-validation`.
- `version-action`: Controls how queried marketplace version is transformed (`None`, `Major`, `Minor`, `Patch`).
- `extension-version-override`: Names an environment variable containing an explicit version override.
- `expected-tasks`: Provides JSON task/version expectations for `wait-for-installation`.
- `vsix-path`: Provides a VSIX path for identity/task discovery in install/share/unshare/validation flows.
- `timeout-minutes`: Sets total wait time for `wait-for-installation`.
- `polling-interval-seconds`: Sets polling frequency for `wait-for-installation` checks.

### Main action outputs

- `vsix-path`: Returns the generated VSIX path from package/publish flows.
- `metadata`: Returns extension metadata JSON from `show`.
- `proposed-version`: Returns the computed version from `query-version`.
- `current-version`: Returns the current marketplace version from `query-version`.

## GitHub Marketplace samples (individual composite actions)

### package

```yaml
- uses: jessehouwing/azdo-marketplace/package@v6
  id: package
  with:
    publisher-id: my-publisher
    extension-id: my-extension
    manifest-file: vss-extension.json

- run: echo "Packaged: ${{ steps.package.outputs.vsix-path }}"
```

### publish

```yaml
- uses: jessehouwing/azdo-marketplace/publish@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: my-publisher
    extension-id: my-extension
    manifest-file: vss-extension.json
```

### install

```yaml
- uses: jessehouwing/azdo-marketplace/install@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    manifest-file: vss-extension.json
    accounts: myorg
```

### share

```yaml
- uses: jessehouwing/azdo-marketplace/share@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    manifest-file: vss-extension.json
    accounts: customer-org
```

### unshare

```yaml
- uses: jessehouwing/azdo-marketplace/unshare@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    manifest-file: vss-extension.json
    accounts: old-customer-org
```

### unpublish

```yaml
- uses: jessehouwing/azdo-marketplace/unpublish@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    manifest-file: vss-extension.json
```

### show

```yaml
- uses: jessehouwing/azdo-marketplace/show@v6
  id: show
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: my-publisher
    extension-id: my-extension

- run: echo '${{ steps.show.outputs.metadata }}'
```

### query-version

```yaml
- uses: jessehouwing/azdo-marketplace/query-version@v6
  id: query
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: my-publisher
    extension-id: my-extension
    version-action: Patch

- run: echo "Next: ${{ steps.query.outputs.proposed-version }}"
```

### wait-for-validation

```yaml
- uses: jessehouwing/azdo-marketplace/wait-for-validation@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    manifest-file: vss-extension.json
    max-retries: '10'
```

### wait-for-installation

```yaml
- uses: jessehouwing/azdo-marketplace/wait-for-installation@v6
  with:
    token: ${{ secrets.MARKETPLACE_TOKEN }}
    publisher-id: my-publisher
    extension-id: my-extension
    accounts: myorg
    manifest-file: vss-extension.json
```

## Contribute

1. From the root of the repo run `npm run initdev`. This will pull down the necessary modules and TypeScript declare files.
2. Run `npm run build` to compile the build tasks.
3. Run `npm run package` to create a .vsix extension package that includes the build tasks.
