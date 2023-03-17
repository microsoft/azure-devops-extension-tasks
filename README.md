# Azure DevOps Extension Tasks
Build: [![Build Status](https://dev.azure.com/jessehouwing/azure-devops-extensions/_apis/build/status/azure-devops-extension-tasks/microsoft.azure-devops-extension-tasks?branchName=main&stageName=Build)](https://dev.azure.com/jessehouwing/azure-devops-extensions/_build/latest?definitionId=77&branchName=main) 
Release: [![Build Status](https://dev.azure.com/jessehouwing/azure-devops-extensions/_apis/build/status/azure-devops-extension-tasks/microsoft.azure-devops-extension-tasks?branchName=main&stageName=Publish%20publicly%20to%20MsDevLabs)](https://dev.azure.com/jessehouwing/azure-devops-extensions/_build/latest?definitionId=77&branchName=main)

This extension provides build and release tasks for packaging and publishing Azure Devops Extensions to the [Visual Studio Marketplace](https://marketplace.visualstudio.com). There are also tasks to share and install your extension to your Azure Devops organization or Team Foundation Server.

## To use

[Learn more](https://marketplace.visualstudio.com/items?itemName=ms-devlabs.vsts-developer-tools-build-tasks) about this extension and install the extension into your Azure DevOps Organization via the Visual Studio Marketplace.

## Available tasks

Azure DevOps

* **Package**: package an Azure DevOps extension into an extension package (.VSIX) file
* **Publish**: (optionally) package and publish an extension (either privately or publicly) to the Visual Studio Marketplace
* **Unpublish**: unpublish an extension from the Visual Studio Marketplace
* **Share**: share an extension with an Azure DevOps organization
* **Install**: install an extension to an Azure DevOps organization
* **Query version**: query an extension's version (to make it easy to increment on your next package or publish)
* **Wait for validation**: waits for the Visual Studio Marketplace validation to come through.

Visual Studio

* **Publish**: Publish a Visual Studio extension to the Visual Studio Marketplace

### Required scopes

 When creating a personal access token for use by your pipeline, make sure the token has at least the following scopes for the task(s) you are using:

* **Publish**: `All accessible organizations`, `Marketplace (publish)`
* **Unpublish**: `All accessible organizations`, `Marketplace (manage)`
* **Share**: `All accessible organizations`, `Marketplace (publish)`
* **Install**: `All accessible organizations` or a specific Organization, `Extensions (read and manage)`, `Marketplace (acquire)`
* **Query Version**: `All accessible organizations`, `Marketplace (read)`
* **Is Valid**: `All accessible organizations`, `Marketplace (read)`

![Permissions](permissions.png)

## Contribute

1. From the root of the repo run `npm run initdev`. This will pull down the necessary modules and TypeScript declare files.
2. Run `npm run build` to compile the build tasks.
3. Run `npm run package` to create a .vsix extension package that includes the build tasks.
