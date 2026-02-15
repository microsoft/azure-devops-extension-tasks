# Quick Debug Reference

Common debugging scenarios and their configurations.

## GitHub Actions

### Package Extension (No Auth)

```bash
# VSCode: Select "Debug GitHub Action - Package" and press F5

# Or manually:
INPUT_OPERATION=package \
INPUT_ROOT-FOLDER=./packages/core/src/__tests__/integration/fixtures/test-extension \
INPUT_OUTPUT-PATH=./dist \
node packages/github-action/src/main.ts
```

### Publish Extension

```bash
# Set token first:
export MARKETPLACE_TOKEN="your-pat-token"

# VSCode: Edit launch.json with your publisher/extension, then F5

# Or manually:
INPUT_OPERATION=publish \
INPUT_AUTH-TYPE=pat \
INPUT_TOKEN=$MARKETPLACE_TOKEN \
INPUT_PUBLISH-SOURCE=manifest \
INPUT_ROOT-FOLDER=./path/to/extension \
INPUT_PUBLISHER-ID=your-publisher \
INPUT_EXTENSION-ID=your-extension \
node packages/github-action/src/main.ts
```

### Test with Local Action

```bash
cd ~/local-action
./run.sh \
  --action /path/to/azure-devops-extension-tasks \
  --env INPUT_OPERATION=package \
  --env INPUT_ROOT-FOLDER=./packages/core/src/__tests__/integration/fixtures/test-extension
```

## Azure Pipelines

### Package Extension (No Auth)

```bash
# VSCode: Select "Debug Azure Pipelines Task - Package" and press F5

# Or manually:
INPUT_OPERATION=package \
INPUT_ROOTFOLDER=./packages/core/src/__tests__/integration/fixtures/test-extension \
INPUT_OUTPUTPATH=./dist \
node packages/azdo-task/src/main.ts
```

### Publish Extension (PAT)

```bash
# Set token:
export MARKETPLACE_TOKEN="your-pat-token"

# VSCode: Edit launch.json with your details, then F5

# Or manually:
INPUT_OPERATION=publish \
INPUT_CONNECTIONTYPE=connectedService:VsTeam \
INPUT_CONNECTIONNAME=MarketplaceConnection \
INPUT_PUBLISHSOURCE=manifest \
INPUT_ROOTFOLDER=./path/to/extension \
INPUT_PUBLISHERID=your-publisher \
INPUT_EXTENSIONID=your-extension \
ENDPOINT_AUTH_PARAMETER_MarketplaceConnection_APITOKEN=$MARKETPLACE_TOKEN \
ENDPOINT_URL_MarketplaceConnection=https://marketplace.visualstudio.com \
ENDPOINT_AUTH_SCHEME_MarketplaceConnection=Token \
node packages/azdo-task/src/main.ts
```

## Environment Variables Quick Reference

### GitHub Actions Inputs

Pattern: `INPUT_<NAME>` (uppercase, keep hyphens)

```bash
INPUT_OPERATION=package
INPUT_ROOT-FOLDER=./extension
INPUT_OUTPUT-PATH=./dist
INPUT_AUTH-TYPE=pat
INPUT_TOKEN=your-token
INPUT_PUBLISHER-ID=publisher
INPUT_EXTENSION-ID=extension
INPUT_TFX-VERSION=built-in
```

### Azure Pipelines Inputs

Pattern: `INPUT_<NAME>` (uppercase, no hyphens)

```bash
INPUT_OPERATION=package
INPUT_ROOTFOLDER=./extension
INPUT_OUTPUTPATH=./dist
INPUT_CONNECTIONTYPE=connectedService:VsTeam
INPUT_CONNECTIONNAME=MarketplaceConnection
INPUT_PUBLISHERID=publisher
INPUT_EXTENSIONID=extension
INPUT_TFXVERSION=built-in
```

### Service Endpoint (Azure Pipelines)

```bash
ENDPOINT_AUTH_PARAMETER_<ConnectionName>_APITOKEN=your-token
ENDPOINT_URL_<ConnectionName>=https://marketplace.visualstudio.com
ENDPOINT_AUTH_SCHEME_<ConnectionName>=Token
```

### Agent/Runner Variables

```bash
# GitHub Actions
RUNNER_TEMP=./.tmp
RUNNER_TOOL_CACHE=./.cache

# Azure Pipelines
AGENT_TEMPDIRECTORY=./.tmp
AGENT_TOOLSDIRECTORY=./.cache
```

## Operations Reference

| Operation      | Auth Required | Key Inputs                                                 |
| -------------- | ------------- | ---------------------------------------------------------- |
| package        | No            | root-folder, output-path                                   |
| publish        | Yes           | auth-type, token, publish-source, root-folder OR vsix-file |
| unpublish      | Yes           | auth-type, token, publisher-id, extension-id               |
| share          | Yes           | auth-type, token, publisher-id, extension-id, share-with   |
| unshare        | Yes           | auth-type, token, publisher-id, extension-id, unshare-with |
| install        | Yes           | auth-type, token, publisher-id, extension-id, accounts     |
| show           | Yes           | auth-type, token, publisher-id, extension-id               |
| is-valid       | Yes           | auth-type, token, publisher-id, extension-id               |
| verify-install | Yes           | auth-type, token, publisher-id, extension-id, accounts     |

## Common Commands

### Build

```bash
npm install
npm run build:v6
```

### Bundle

```bash
npm run bundle
```

### Test

```bash
npm test
```

### Clean

```bash
npm run clean
```

## VSCode Launch Configs

Available debug configurations:

- `Debug GitHub Action - Package`
- `Debug GitHub Action - Publish`
- `Debug GitHub Action - Show`
- `Debug Azure Pipelines Task - Package`
- `Debug Azure Pipelines Task - Publish (PAT)`
- `Debug Azure Pipelines Task - Show`
- `Debug Tests`

Press F5 after selecting a configuration, or use the Debug panel (Ctrl+Shift+D).
