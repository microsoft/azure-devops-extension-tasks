# Local Action Testing with github/local-action

This directory contains configuration for testing GitHub Actions locally using [github/local-action](https://github.com/github/local-action).

## Prerequisites

1. Install Docker Desktop
2. Clone the local-action repository:
   ```bash
   git clone https://github.com/github/local-action.git ~/local-action
   cd ~/local-action
   npm install
   npm run build
   ```

## Quick Start

### Test Package Command

```bash
cd ~/local-action
./run.sh \
  --action ../azure-devops-extension-tasks \
  --env INPUT_OPERATION=package \
  --env INPUT_ROOT-FOLDER=./packages/core/src/__tests__/integration/fixtures/test-extension \
  --env INPUT_OUTPUT-PATH=./dist \
  --env INPUT_TFX-VERSION=built-in
```

### Test Publish Command (requires token)

```bash
cd ~/local-action
./run.sh \
  --action ../azure-devops-extension-tasks \
  --env INPUT_OPERATION=publish \
  --env INPUT_AUTH-TYPE=pat \
  --env INPUT_TOKEN=$MARKETPLACE_TOKEN \
  --env INPUT_PUBLISH-SOURCE=manifest \
  --env INPUT_ROOT-FOLDER=./packages/core/src/__tests__/integration/fixtures/test-extension \
  --env INPUT_PUBLISHER-ID=your-publisher \
  --env INPUT_EXTENSION-ID=your-extension \
  --env INPUT_TFX-VERSION=built-in
```

### Test Show Command

```bash
cd ~/local-action
./run.sh \
  --action ../azure-devops-extension-tasks \
  --env INPUT_OPERATION=show \
  --env INPUT_AUTH-TYPE=pat \
  --env INPUT_TOKEN=$MARKETPLACE_TOKEN \
  --env INPUT_PUBLISHER-ID=your-publisher \
  --env INPUT_EXTENSION-ID=your-extension
```

## Environment Variables

GitHub Actions use INPUT\_\* pattern for inputs (uppercase, hyphens converted to underscores):

- `INPUT_OPERATION` - The operation to perform (package, publish, show, etc.)
- `INPUT_AUTH-TYPE` - Authentication type (pat, oidc)
- `INPUT_TOKEN` - Marketplace PAT token
- `INPUT_ROOT-FOLDER` - Path to extension manifest
- `INPUT_OUTPUT-PATH` - Output directory for package command
- `INPUT_PUBLISHER-ID` - Extension publisher ID
- `INPUT_EXTENSION-ID` - Extension ID
- `INPUT_TFX-VERSION` - TFX CLI version (built-in, latest, or specific version)

See [action.yml](../../action.yml) for complete list of inputs.

## Example Workflow File

Create `.github/local-action/test-workflow.yml` for more complex testing:

```yaml
name: Test Local Action
on: workflow_dispatch

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Package Extension
        uses: ./
        with:
          operation: 'package'
          root-folder: './packages/core/src/__tests__/integration/fixtures/test-extension'
          output-path: './dist'
```

Then run with local-action:

```bash
./run.sh --workflow ../azure-devops-extension-tasks/.github/local-action/test-workflow.yml
```

## Tips

1. **Use absolute paths** or ensure working directory is correct
2. **Set MARKETPLACE_TOKEN** environment variable for authenticated operations
3. **Check logs** in the Docker container for debugging
4. **Build first** - Run `npm run build` before testing
5. **Bundle for testing** - Run `npm run bundle` to test with bundled code

## Troubleshooting

### Action fails to start

- Ensure you've built the action: `npm run build`
- Check that action.yml exists in the root

### Authentication errors

- Verify MARKETPLACE_TOKEN is set and valid
- Check token has correct permissions for the operation

### Module not found errors

- Run `npm install` in the repository root
- Ensure all workspace packages are built

## Resources

- [GitHub Local Action Documentation](https://github.com/github/local-action)
- [GitHub Actions Environment Variables](https://docs.github.com/en/actions/learn-github-actions/environment-variables)
- [Action Debug Logging](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/enabling-debug-logging)
