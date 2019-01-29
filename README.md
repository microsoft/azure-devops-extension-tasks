# CI/CD Tools for VSTS extensions
[![Build status](https://almrangers.visualstudio.com/ALM/_apis/build/status/Extensions/Azure%20DevOps%20Extension%20Tasks)](https://almrangers.visualstudio.com/ALM/_build/latest?definitionId=127) [![Release status](https://almrangers.vsrm.visualstudio.com/_apis/public/Release/badge/7f3cfb9a-d1cb-4e66-9d36-1af87b906fe9/25/70)](https://almrangers.visualstudio.com/ALM/_releaseDefinition?definitionId=25)

This extension provides build and release tasks for packaging and publishing Azure Devops Extensions to the [Visual Studio Marketplace](https://marketplace.visualstudio.com). There are also tasks to share and install your extension to your Azure Devops organisation or Team Foundation Server.

## To use

[Learn more](https://marketplace.visualstudio.com/items?itemName=ms-devlabs.vsts-developer-tools-build-tasks) about this extension about and install the extension into your Azure DevOps Organisation via the Visual Studio Marketplace.

## Available tasks

Azure DevOps

* **Package**: package an Azure DevOps extension into an extension package (.VSIX) file
* **Publish**: optionally package and publish an extension (either privately or publicly) to the Visual Studio Marketplace
* **Share**: share an extension with an Azure DevOps organisation
* **Install**: install an extension to an Azure DevOps organisation
* **Query version**: query an extension's version (to make it easy to increment on your next package or publish)
* **Wait for validation**: waits for the Visual Studio Marketplace validation to come through.

Visual Studio

* **Publish**: Publish a Visual Studio extension to the Visual Studio Marketplace

## Contribute

1. From the root of the repo run `npm run initdev`. This will pull down the necessary modules and TypeScript declare files.
2. Run `npm run build` to compile the build tasks.
3. Run `npm run package` to create a .vsix extension package that includes the build tasks.
