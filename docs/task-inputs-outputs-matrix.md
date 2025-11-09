# Task Inputs and Outputs Matrix

Generated: 2025-11-09T15:02:51.710Z

Total tasks analyzed: 19

## Table of Contents

- [ExtensionVersion](#extensionversion)
- [InstallExtension](#installextension)
- [IsValidExtension](#isvalidextension)
- [IsValidExtensionAgent](#isvalidextensionagent)
- [PackageExtension](#packageextension)
- [PublishExtension](#publishextension)
- [PublishVSExtension](#publishvsextension)
- [ShareExtension](#shareextension)
- [TfxInstaller](#tfxinstaller)
- [UnpublishExtension](#unpublishextension)

## ExtensionVersion

**Description:** Queries the current version from the Visual Studio Marketplace

**Category:** Utility

**Versions:**
- v4: v4.4.0
- v5: v5.0.0

### Inputs

| Input Name | Type | Required | Default | Description |
|------------|------|----------|---------|-------------|
| connectTo | radio | Yes | `AzureRM` | Connect to Visual Studio Marketplace or a local Azure DevOps Server. |
| connectedServiceName | connectedService:VstsMarketplacePublishing | Yes | `-` | Service endpoint connection to install the extension. |
| connectedServiceNameAzureRM | connectedService:AzureRM | Yes | `-` | Service endpoint connection to install the extension. |
| connectedServiceNameTFS | connectedService:TfsMarketplacePublishing | Yes | `-` | Service endpoint connection to install the extension. |
| publisherId | string | Yes | `-` | Publisher ID of the extension to be installed. |
| extensionId | string | Yes | `-` | Extension ID of the extension to be installed |
| extensionTag | string | No | `-` | Extension Tag to append to the extension ID |
| versionAction | pickList | Yes | `None` | Increase version |
| setBuildNumber | boolean | No | `-` | Updates the Build Number with the new version number. |
| extensionVersionOverride | string | No | `Extension.VersionOverride` | When this value is specified the extension version task will take it regardless of the version retur |
| arguments | string | No | `-` | Additional arguments passed to the package and publishing tool. |
| cwd | filePath | No | `-` | Working directory to run the package and publishing process from. Defaults to the folder where the m |

### Output Variables

*No output variables defined*

### Execution

**Supported runtimes:** Node20_1, Node16

- **Node20_1:** ExtensionVersion/v5/ExtensionVersion.js
- **Node16:** ExtensionVersion/v5/ExtensionVersion.js

---

## InstallExtension

**Description:** Install a published extension to an Azure DevOps organisation or Team Foundation Server

**Category:** Deploy

**Versions:**
- v4: v4.4.0
- v5: v5.0.0

### Inputs

| Input Name | Type | Required | Default | Description |
|------------|------|----------|---------|-------------|
| connectTo | radio | Yes | `AzureRM` | Connect to Visual Studio Marketplace or a local Azure DevOps Server. |
| connectedServiceName | connectedService:VstsMarketplacePublishing | Yes | `-` | Service endpoint connection to install the extension. |
| connectedServiceNameAzureRM | connectedService:AzureRM | Yes | `-` | Service endpoint connection to install the extension. |
| connectedServiceNameTFS | connectedService:TfsMarketplacePublishing | Yes | `-` | Service endpoint connection to install the extension. |
| method | radio | Yes | `id` | Install using either an existing VSIX or using the Publisher and Extension ID. |
| publisherId | string | Yes | `-` | Publisher ID of the extension to be installed. |
| extensionId | string | Yes | `-` | Extension ID of the extension to be installed |
| extensionTag | string | No | `-` | Extension Tag to append to the extension ID |
| vsixFile | filePath | Yes | `-` | VSIX file of the extension to be installed. Supports wildcards. |
| accounts | string | Yes | `-` | Comma separated list of organisation urls where to install the extension (e.g. `https://devops.azure |
| arguments | string | No | `-` | Additional arguments passed to the package and publishing tool. |
| cwd | filePath | No | `-` | Working directory to run the package and publishing process from. Defaults to the folder where the m |

### Output Variables

*No output variables defined*

### Execution

**Supported runtimes:** Node20_1, Node16

- **Node20_1:** InstallExtension/v5/InstallExtension.js
- **Node16:** InstallExtension/v5/InstallExtension.js

---

## IsValidExtension

**Description:** Check Marketplace validation status.

**Category:** Deploy

**Versions:**
- task.json: v5.0.0

### Inputs

| Input Name | Type | Required | Default | Description |
|------------|------|----------|---------|-------------|
| connectTo | radio | Yes | `VsTeam` | Connect to Visual Studio Marketplace. |
| connectedServiceName | connectedService:VstsMarketplacePublishing | Yes | `-` | Service endpoint connection to install the extension. |
| method | radio | Yes | `id` | Validate using either an existing VSIX or using the Publisher, Extension ID and version. |
| publisherId | string | Yes | `-` | Publisher ID of the extension to be installed. |
| extensionId | string | Yes | `-` | Extension ID of the extension to be installed |
| extensionTag | string | No | `-` | Extension Tag to append to the extension ID |
| extensionVersion | string | No | `latest` | Extension version (enter 'latest' or leave the value empty to check the last submitted version). |

### Output Variables

*No output variables defined*

### Execution

**Supported runtimes:** HttpRequest

- **HttpRequest:** N/A

---

## IsValidExtensionAgent

**Description:** Check Visual Studio Marketplace validation status.

**Category:** Deploy

**Versions:**
- v4: v4.4.0
- v5: v5.0.0

### Inputs

| Input Name | Type | Required | Default | Description |
|------------|------|----------|---------|-------------|
| connectTo | radio | Yes | `AzureRM` | Connect to Visual Studio Marketplace or a local Azure DevOps Server. |
| connectedServiceName | connectedService:VstsMarketplacePublishing | Yes | `-` | Service endpoint connection to install the extension. |
| connectedServiceNameAzureRM | connectedService:AzureRM | Yes | `-` | Service endpoint connection to install the extension. |
| method | radio | Yes | `id` | Validate using either an existing VSIX or using the Publisher, Extension ID and version. |
| publisherId | string | Yes | `-` | Publisher ID of the extension to be installed. |
| extensionId | string | Yes | `-` | Extension ID of the extension to be installed |
| extensionTag | string | No | `-` | Extension Tag to append to the extension ID |
| extensionVersion | string | No | `-` | Extension version (leave the value empty to check the last submitted version). |
| vsixFile | filePath | Yes | `-` | VSIX file of the extension to be installed. Supports wildcards. |
| maxRetries | string | No | `10` | Maximum number of retries. |
| minTimeout | string | No | `1` | Time between retries (minutes). |

### Output Variables

*No output variables defined*

### Execution

**Supported runtimes:** Node20_1, Node16

- **Node20_1:** IsValidExtensionAgent/v5/IsValidExtension.js
- **Node16:** IsValidExtensionAgent/v5/IsValidExtension.js

---

## PackageExtension

**Description:** Package an Azure DevOps extension into a VSIX file

**Category:** Package

**Versions:**
- v4: v4.4.0
- v5: v5.0.0

### Inputs

| Input Name | Type | Required | Default | Description |
|------------|------|----------|---------|-------------|
| rootFolder | filePath | No | `-` | Root folder from which the manifests are searched. |
| localizationRoot | filePath | No | `-` | Folder where localization file(s) exist. |
| patternManifest | multiLine | No | `vss-extension.json` | Specify the pattern for manifest files. One file per line. |
| outputPath | filePath | No | `-` | Specify the path and file name of the generated vsix. |
| outputVariable | string | No | `Extension.OutputPath` | The variable name to assign the location of the generated package to. Specify only the name, e.g.: ` |
| publisherId | string | No | `-` | Extension publisher ID. If not specified, the publisher specified in the manifest will be used. |
| extensionId | string | No | `-` | Overrides extension ID. If not specified, the extension ID specified in the manifest will be used |
| extensionTag | string | No | `-` | Extension Tag to append to the extension ID |
| extensionName | string | No | `-` | Overrides extension name. If not specified, the extension name specified in the manifest will be use |
| extensionVersion | string | No | `-` | Overrides extension version. If not specified, the extension version specified in the manifest will  |
| updateTasksVersion | boolean | Yes | `false` | Search for contributed tasks in extension manifests and updates the version specified in each Build  |
| updateTasksVersionType | pickList | No | `major` | The Task version replacement format. You can select which part(s) of the version number to update (M |
| updateTasksId | boolean | No | `false` | Search for contributed tasks in extension manifests and updates the id specified in each Build and R |
| extensionVisibility | pickList | No | `default` | Overrides extension visibility (Public vs Private) and optionally adds the Preview flag. If not spec |
| extensionPricing | pickList | No | `default` | Overrides extension pricing (Free vs Paid). If not specified, the extension pricing specified in the |
| bypassLocalValidation | boolean | No | `false` | Bypass local validation. |
| arguments | string | No | `-` | Additional arguments passed to tfx. |
| cwd | filePath | No | `-` | Current working directory when tfx is run. Defaults to the folder where the manifest is located. |

### Output Variables

| Variable Name | Description |
|---------------|-------------|
| Extension.OutputPath | Is set with the generated vsix path. |

### Execution

**Supported runtimes:** Node20_1, Node16

- **Node20_1:** PackageExtension/v5/PackageExtension.js
- **Node16:** PackageExtension/v5/PackageExtension.js

---

## PublishExtension

**Description:** Publish an Azure DevOps extension to the Visual Studio Marketplace

**Category:** Deploy

**Versions:**
- v4: v4.4.0
- v5: v5.0.0

### Inputs

| Input Name | Type | Required | Default | Description |
|------------|------|----------|---------|-------------|
| connectTo | radio | Yes | `AzureRM` | Connect to Visual Studio Marketplace or a local Azure DevOps Server. |
| connectedServiceName | connectedService:VstsMarketplacePublishing | Yes | `-` | Service endpoint connection to install the extension. |
| connectedServiceNameAzureRM | connectedService:AzureRM | Yes | `-` | Service endpoint connection to install the extension. |
| connectedServiceNameTFS | connectedService:TfsMarketplacePublishing | Yes | `-` | Service endpoint connection to install the extension. |
| fileType | radio | Yes | `manifest` | Input file type |
| vsixFile | filePath | Yes | `-` | VSIX file to publish. Supports wildcards. |
| rootFolder | filePath | No | `-` | Folder where manifest file(s) exist. |
| localizationRoot | filePath | No | `-` | Folder where localization file(s) exist. |
| patternManifest | multiLine | No | `vss-extension.json` | Specify the pattern for manifest files. One file per line. |
| publisherId | string | No | `-` | Extension publisher ID. If not specified, the publisher specified in the manifest will be used. |
| extensionId | string | No | `-` | Overrides extension ID. If not specified, the extension ID specified in the manifest will be used |
| extensionTag | string | No | `-` | Extension Tag to append to the extension ID |
| extensionName | string | No | `-` | Overrides extension name. If not specified, the extension name specified in the manifest will be use |
| extensionVersion | string | No | `-` | Overrides extension version. If not specified, the extension version specified in the manifest will  |
| updateTasksVersion | boolean | No | `true` | Search for contributed tasks in extension manifests and updates the version specified in each Build  |
| updateTasksVersionType | pickList | No | `major` | The Task version replacement format. You can select which part(s) of the version number to update (M |
| updateTasksId | boolean | No | `false` | Search for contributed tasks in extension manifests and updates the id specified in each Build and R |
| extensionVisibility | pickList | No | `default` | Overrides extension visibility (Public vs Private) and optionally adds the Preview flag. If not spec |
| extensionPricing | pickList | No | `default` | Overrides extension pricing (Free vs Paid). If not specified, the extension pricing specified in the |
| outputVariable | string | No | `Extension.OutputPath` | The variable name to assign the location of the generated package to. Specify only the name, e.g.: ` |
| shareWith | string | No | `-` | Comma separated list of organisations with which to share the extension if it's private (e.g. org_x, |
| bypassLocalValidation | boolean | No | `false` | Bypass local validation. |
| noWaitValidation | boolean | No | `false` | Don't block command for extension validation. |
| arguments | string | No | `-` | Additional arguments passed to the package and publishing tool. |
| cwd | filePath | No | `-` | Working directory to run the package and publishing process from. Defaults to the folder where the m |

### Output Variables

| Variable Name | Description |
|---------------|-------------|
| Extension.OutputPath | Is set with the generated vsix path. |

### Execution

**Supported runtimes:** Node20_1, Node16

- **Node20_1:** PublishExtension/v5/PublishExtension.js
- **Node16:** PublishExtension/v5/PublishExtension.js

---

## PublishVSExtension

**Description:** Publish Visual Studio extension to the Visual Studio Marketplace

**Category:** Deploy

**Versions:**
- v4: v4.4.0
- v5: v5.0.0

### Inputs

| Input Name | Type | Required | Default | Description |
|------------|------|----------|---------|-------------|
| connectTo | radio | Yes | `AzureRM` | Connect to Visual Studio Marketplace or a local Azure DevOps Server. |
| connectedServiceName | connectedService:VstsMarketplacePublishing | Yes | `-` | Service endpoint connection to install the extension. |
| connectedServiceNameAzureRM | connectedService:AzureRM | Yes | `-` | Service endpoint connection to install the extension. |
| vsixFile | filePath | Yes | `-` | VSIX file to publish. |
| manifestFile | filePath | Yes | `-` | Path for the manifest file. [more](https://docs.microsoft.com/en-us/visualstudio/extensibility/walkt |
| publisherId | string | Yes | `-` | Extension publisher ID. |
| ignoreWarnings | string | No | `-` | List of warnings to ignore when publishing an extension. These warnings are shown as command line me |

### Output Variables

*No output variables defined*

### Execution

**Supported runtimes:** Node20_1, Node16

- **Node20_1:** PublishVSExtension/v5/PublishVSExtension.js
- **Node16:** PublishVSExtension/v5/PublishVSExtension.js

---

## ShareExtension

**Description:** Share a published extension with a Azure Devops organisation

**Category:** Deploy

**Versions:**
- v4: v4.4.0
- v5: v5.0.0

### Inputs

| Input Name | Type | Required | Default | Description |
|------------|------|----------|---------|-------------|
| connectTo | radio | Yes | `AzureRM` | Connect to Visual Studio Marketplace or a local Azure DevOps Server. |
| connectedServiceName | connectedService:VstsMarketplacePublishing | Yes | `-` | Service endpoint connection to install the extension. |
| connectedServiceNameAzureRM | connectedService:AzureRM | Yes | `-` | Service endpoint connection to install the extension. |
| method | radio | Yes | `id` | Share using either an existing VSIX or using the Publisher and Extension ID. |
| publisherId | string | Yes | `-` | Publisher ID of the extension to be shared. |
| extensionId | string | Yes | `-` | Extension ID of the extension to be shared |
| extensionTag | string | No | `-` | Extension Tag to append to the extension id |
| vsixFile | filePath | Yes | `-` | VSIX file of the extension to be shared. Supports wildcards. |
| accounts | string | Yes | `-` | Comma separated list of organisations where to install the extension (e.g. org_x,org_y,org_z) |
| arguments | string | No | `-` | Additional arguments passed to the package and publishing tool. |
| cwd | filePath | No | `-` | Working directory to run the package and publishing process from. Defaults to the folder where the m |

### Output Variables

*No output variables defined*

### Execution

**Supported runtimes:** Node20_1, Node16

- **Node20_1:** ShareExtension/v5/ShareExtension.js
- **Node16:** ShareExtension/v5/ShareExtension.js

---

## TfxInstaller

**Description:** Installs the Node CLI for Azure DevOps (tfx-cli) on your agent.

**Category:** Tool

**Versions:**
- v4: v4.4.0
- v5: v5.0.0

### Inputs

| Input Name | Type | Required | Default | Description |
|------------|------|----------|---------|-------------|
| version | pickList | Yes | `builtin` | Specify which `tfx-cli` version you want to use. Examples: `v0.9.x`, `>=v0.5.x`. |
| checkLatest | boolean | No | `true` | Automatically download the latest version. |

### Output Variables

*No output variables defined*

### Execution

**Supported runtimes:** Node20_1, Node16

- **Node20_1:** TfxInstaller/v5/TfxInstaller.js
- **Node16:** TfxInstaller/v5/TfxInstaller.js

---

## UnpublishExtension

**Description:** Unpublish a published extension from the marketplace

**Category:** Deploy

**Versions:**
- v4: v4.4.0
- v5: v5.0.0

### Inputs

| Input Name | Type | Required | Default | Description |
|------------|------|----------|---------|-------------|
| connectTo | radio | Yes | `AzureRM` | Connect to Visual Studio Marketplace or a local Azure DevOps Server. |
| connectedServiceName | connectedService:VstsMarketplacePublishing | Yes | `-` | Service endpoint connection to install the extension. |
| connectedServiceNameAzureRM | connectedService:AzureRM | Yes | `-` | Service endpoint connection to install the extension. |
| connectedServiceNameTFS | connectedService:TfsMarketplacePublishing | Yes | `-` | Service endpoint connection to unpublish the extension. |
| method | radio | Yes | `id` | Unpublish using either an existing VSIX or using the Publisher and Extension ID. |
| publisherId | string | Yes | `-` | Publisher ID of the extension to be unpublished. |
| extensionId | string | Yes | `-` | Extension ID of the extension to be unpublished |
| extensionTag | string | No | `-` | Extension Tag to append to the extension ID |
| vsixFile | filePath | Yes | `-` | VSIX file of the extension to be unpublished. Supports wildcards. |
| arguments | string | No | `-` | Additional arguments passed to the package and publishing tool. |
| cwd | filePath | No | `-` | Working directory to run the package and publishing process from. Defaults to the folder where the m |

### Output Variables

*No output variables defined*

### Execution

**Supported runtimes:** Node20_1, Node16

- **Node20_1:** UnpublishExtension/v5/UnpublishExtension.js
- **Node16:** UnpublishExtension/v5/UnpublishExtension.js

---

