# Environment Variables Reference

This document lists all well-known environment variables used by GitHub Actions and Azure Pipelines for debugging and local testing.

## GitHub Actions Environment Variables

These variables are automatically set by GitHub Actions. For local debugging, they are set in `.vscode/launch.json`.

### Runner Environment

| Variable            | Description                      | Example Value               |
| ------------------- | -------------------------------- | --------------------------- |
| `RUNNER_TEMP`       | Temporary directory path         | `${workspaceFolder}/.tmp`   |
| `RUNNER_TOOL_CACHE` | Tool cache directory             | `${workspaceFolder}/.cache` |
| `GITHUB_WORKSPACE`  | Working directory for the action | `${workspaceFolder}`        |

### GitHub Context

| Variable            | Description                                           | Example Value         |
| ------------------- | ----------------------------------------------------- | --------------------- |
| `GITHUB_ACTIONS`    | Always set to `true` when running in GitHub Actions   | `true`                |
| `GITHUB_WORKFLOW`   | Name of the workflow                                  | `Debug GitHub Action` |
| `GITHUB_RUN_ID`     | Unique number for each workflow run                   | `1`                   |
| `GITHUB_RUN_NUMBER` | Unique number for each run of a particular workflow   | `1`                   |
| `GITHUB_JOB`        | Job ID of the current job                             | `debug`               |
| `GITHUB_ACTION`     | Unique identifier of the action                       | `debug-action`        |
| `GITHUB_ACTOR`      | Name of the person or app that initiated the workflow | `developer`           |
| `GITHUB_REPOSITORY` | Owner and repository name                             | `owner/repo`          |
| `GITHUB_EVENT_NAME` | Name of the event that triggered the workflow         | `workflow_dispatch`   |
| `GITHUB_SHA`        | Commit SHA that triggered the workflow                | 40-char hex string    |
| `GITHUB_REF`        | Full form of the branch or tag ref                    | `refs/heads/main`     |
| `GITHUB_REF_NAME`   | Short ref name                                        | `main`                |
| `GITHUB_REF_TYPE`   | Type of ref (branch or tag)                           | `branch`              |

### Action Inputs

Action inputs are exposed as environment variables with `INPUT_` prefix (uppercase, hyphens preserved):

```bash
INPUT_OPERATION=package
INPUT_ROOT-FOLDER=./extension
INPUT_OUTPUT-PATH=./dist
INPUT_AUTH-TYPE=pat
INPUT_TOKEN=your-token
INPUT_PUBLISHER-ID=publisher
INPUT_EXTENSION-ID=extension
```

### References

- [GitHub Actions Default Environment Variables](https://docs.github.com/en/actions/learn-github-actions/environment-variables#default-environment-variables)
- [GitHub Actions Contexts](https://docs.github.com/en/actions/learn-github-actions/contexts)

## Azure Pipelines Environment Variables

These variables are automatically set by Azure Pipelines. For local debugging, they are set in `.vscode/launch.json`.

### Agent Environment

| Variable               | Description                     | Example Value               |
| ---------------------- | ------------------------------- | --------------------------- |
| `AGENT_TEMPDIRECTORY`  | Temporary directory path        | `${workspaceFolder}/.tmp`   |
| `AGENT_TOOLSDIRECTORY` | Tool cache directory            | `${workspaceFolder}/.cache` |
| `AGENT_WORKFOLDER`     | Working directory for the agent | `${workspaceFolder}/.work`  |
| `AGENT_VERSION`        | Version of the agent            | `3.0.0`                     |
| `AGENT_JOBSTATUS`      | Status of the current job       | `Succeeded`                 |
| `AGENT_NAME`           | Name of the agent               | `Debug Agent`               |
| `AGENT_MACHINENAME`    | Name of the machine             | `debug-machine`             |

### Build Environment

| Variable                     | Description                                                  | Example Value        |
| ---------------------------- | ------------------------------------------------------------ | -------------------- |
| `BUILD_SOURCESDIRECTORY`     | Local path on the agent where source code is downloaded      | `${workspaceFolder}` |
| `BUILD_REPOSITORY_LOCALPATH` | Local path on the agent where the repository is cloned       | `${workspaceFolder}` |
| `BUILD_BUILDID`              | Unique identifier of the build                               | `1`                  |
| `BUILD_BUILDNUMBER`          | Name of the completed build                                  | `1`                  |
| `BUILD_DEFINITIONNAME`       | Name of the build pipeline                                   | `Debug Build`        |
| `BUILD_REPOSITORY_NAME`      | Name of the repository                                       | `repo`               |
| `BUILD_REPOSITORY_PROVIDER`  | Type of repository (TfsGit, GitHub, etc.)                    | `GitHub`             |
| `BUILD_SOURCEVERSION`        | Latest version control change that is included in this build | 40-char hex string   |
| `BUILD_SOURCEBRANCH`         | Branch the build was queued for                              | `refs/heads/main`    |
| `BUILD_SOURCEBRANCHNAME`     | Name of the branch                                           | `main`               |

### System Environment

| Variable                             | Description                                           | Example Value                  |
| ------------------------------------ | ----------------------------------------------------- | ------------------------------ |
| `SYSTEM_DEFAULTWORKINGDIRECTORY`     | Default working directory path                        | `${workspaceFolder}`           |
| `SYSTEM_TEAMPROJECT`                 | Name of the project                                   | `DebugProject`                 |
| `SYSTEM_COLLECTIONURI`               | Team Foundation Server or Azure DevOps collection URI | `https://dev.azure.com/debug/` |
| `SYSTEM_TEAMFOUNDATIONCOLLECTIONURI` | Team Foundation Collection URI                        | `https://dev.azure.com/debug/` |

### Task Inputs

Task inputs are exposed as environment variables with `INPUT_` prefix (uppercase, no hyphens):

```bash
INPUT_OPERATION=package
INPUT_ROOTFOLDER=./extension
INPUT_OUTPUTPATH=./dist
INPUT_CONNECTIONTYPE=connectedService:VsTeam
INPUT_CONNECTIONNAME=MarketplaceConnection
INPUT_PUBLISHERID=publisher
INPUT_EXTENSIONID=extension
```

### Service Endpoints

Service endpoint configuration uses special environment variables:

```bash
ENDPOINT_URL_<ConnectionName>=https://marketplace.visualstudio.com
ENDPOINT_AUTH_PARAMETER_<ConnectionName>_APITOKEN=your-token
ENDPOINT_AUTH_SCHEME_<ConnectionName>=Token
```

Example for connection named "MarketplaceConnection":

```bash
ENDPOINT_URL_MarketplaceConnection=https://marketplace.visualstudio.com
ENDPOINT_AUTH_PARAMETER_MarketplaceConnection_APITOKEN=your-pat-token
ENDPOINT_AUTH_SCHEME_MarketplaceConnection=Token
```

### Node.js Environment

| Variable             | Description                 | Example Value |
| -------------------- | --------------------------- | ------------- |
| `NODE_ENV`           | Node environment            | `production`  |
| `NO_UPDATE_NOTIFIER` | Disable npm update notifier | `true`        |

### References

- [Azure Pipelines Predefined Variables](https://learn.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops&tabs=yaml)
- [Azure Pipelines Agent Variables](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/variables?view=azure-devops&tabs=yaml%2Cbatch#agent-variables)

## Common Variables Set in Scripts

Based on the test scripts in the `Scripts/` folder, these variables are commonly set:

### From test-packaging.cmd

```cmd
set INPUT_VERSION=builtin
set INPUT_PUBLISHERID=publisher
set AGENT_VERSION=2.211.2
set AGENT_WORKFOLDER=%temp%\agent\work
set AGENT_TOOLSDIRECTORY=%temp%\agent\tools
set AGENT_TEMPDIRECTORY=%temp%\agent\tmp
set NODE_ENV=production
set NO_UPDATE_NOTIFIER=true
set INPUT_EXTENSIONID=ext
set INPUT_EXTENSIONVERSION=8.9.10
set INPUT_ROOTFOLDER=D:\azure-devops-extension-tasks\
set INPUT_UPDATETASKSID=true
set INPUT_UPDATETASKSVERSION=major
set INPUT_PATTERNMANIFEST=vss-extension.json
```

### From test-publishing.cmd

```cmd
set SYSTEM_DEFAULTWORKINGDIRECTORY=D:\azure-devops-extension-tasks\
set INPUT_CWD=D:\azure-devops-extension-tasks\
set INPUT_ROOTFOLDER=D:\azure-devops-extension-tasks\
set INPUT_VSIXFILE=D:\azure-devops-extension-tasks\extension.vsix
set INPUT_CONNECTTO=VsTeam
set INPUT_FILETYPE=vsix
set INPUT_EXTENSIONVISIBILITY=default
set INPUT_EXTENSIONVERSION=3.26.23
set INPUT_UPDATETASKSVERSION=major
set INPUT_CONNECTEDSERVICENAME=A
set INPUT_VERSION=builtin
set ENDPOINT_URL_A=https://marketplace.visualstudio.com
set ENDPOINT_AUTH_A={ "parameters": { "password": "token" }, "Scheme": "basic" }
set NODE_ENV=production
set NO_UPDATE_NOTIFIER=true
```

### From test-isvalid.cmd

```cmd
set INPUT_METHOD=id
set INPUT_PUBLISHERID=jessehouwing
set INPUT_EXTENSIONID=extension-id
set INPUT_EXTENSIONVERSION=3.0.1122
set INPUT_CONNECTEDSERVICENAME=A
set INPUT_VERSION=builtin
set ENDPOINT_URL_A=https://marketplace.visualstudio.com
set ENDPOINT_AUTH_A={ "parameters": { "password": "token" }, "Scheme": "basic" }
set AGENT_WORKFOLDER=%temp%\agent\work
set AGENT_TOOLSDIRECTORY=%temp%\agent\tools
set AGENT_TEMPDIRECTORY=%temp%\agent\tmp
set NODE_ENV=production
set NO_UPDATE_NOTIFIER=true
```

## Using Environment Variables in VSCode

All environment variables are pre-configured in `.vscode/launch.json`. To customize:

1. Open `.vscode/launch.json`
2. Find the configuration you want to debug
3. Modify the `env` section
4. Press F5 to start debugging

Example:

```json
{
  "env": {
    "INPUT_OPERATION": "package",
    "INPUT_PUBLISHERID": "your-publisher",
    "MARKETPLACE_TOKEN": "${env:MARKETPLACE_TOKEN}"
  }
}
```

## Setting Environment Variables

### Linux/Mac

```bash
export MARKETPLACE_TOKEN="your-token"
export BUILD_BUILDNUMBER="1.0.0"
```

### Windows PowerShell

```powershell
$env:MARKETPLACE_TOKEN = "your-token"
$env:BUILD_BUILDNUMBER = "1.0.0"
```

### Windows CMD

```cmd
set MARKETPLACE_TOKEN=your-token
set BUILD_BUILDNUMBER=1.0.0
```

### In VSCode launch.json

Use `${env:VARIABLE_NAME}` to reference existing environment variables:

```json
{
  "env": {
    "INPUT_TOKEN": "${env:MARKETPLACE_TOKEN}"
  }
}
```

## Testing with Different Scenarios

### Test Package Command

No authentication required:

```bash
INPUT_OPERATION=package
INPUT_ROOTFOLDER=./extension
INPUT_OUTPUTPATH=./dist
```

### Test Publish Command

Requires authentication:

```bash
INPUT_OPERATION=publish
INPUT_AUTH-TYPE=pat
INPUT_TOKEN=$MARKETPLACE_TOKEN
INPUT_PUBLISHSOURCE=manifest
INPUT_ROOTFOLDER=./extension
INPUT_PUBLISHERID=publisher
INPUT_EXTENSIONID=extension
```

### Test with Build Information

```bash
BUILD_BUILDNUMBER=1.2.3
BUILD_SOURCEBRANCH=refs/heads/develop
BUILD_SOURCEVERSION=abc123def456
INPUT_EXTENSIONVERSION=${BUILD_BUILDNUMBER}
```

## Troubleshooting

### Variable not being read

1. Check variable name matches input name (case-sensitive)
2. For GitHub Actions: Keep hyphens as-is (`INPUT_ROOT-FOLDER`)
3. For Azure Pipelines: Remove hyphens (`INPUT_ROOTFOLDER`)
4. Ensure environment variable is actually set

### Token not working

1. Verify token is set: `echo $MARKETPLACE_TOKEN`
2. Check token has correct permissions
3. Ensure token is passed correctly in launch.json: `"${env:MARKETPLACE_TOKEN}"`

### Path issues

1. Use absolute paths or `${workspaceFolder}` variable
2. Ensure paths use correct separator for your OS
3. Check that directories exist

## References

- [GitHub Actions Environment Variables](https://docs.github.com/en/actions/learn-github-actions/environment-variables)
- [Azure Pipelines Predefined Variables](https://learn.microsoft.com/en-us/azure/devops/pipelines/build/variables)
- [VSCode Launch Configuration](https://code.visualstudio.com/docs/editor/debugging#_launch-configurations)
