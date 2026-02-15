This extension provides build and release tasks for packaging and publishing Azure Devops Extensions to the [Visual Studio Marketplace](https://marketplace.visualstudio.com). There are also tasks to share and install your extension to your Azure Devops organisation or Team Foundation Server.

## How to use

After installing the extension, you can add one (or more) of the tasks to [your pipeline](https://docs.microsoft.com/en-us/azure/devops/pipelines/?WT.mc_id=DOP-MVP-5001511&view=azure-devops). You can find an [example YAML pipeline in the form of the pipeline which publishes this extension](https://github.com/microsoft/azure-devops-extension-tasks/blob/main/azure-pipelines.yml).

![add-task](./Images/add-task.png)

If you plan to publish to the Marketplace, you will need to [create a personal access token](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?WT.mc_id=DOP-MVP-5001511&view=azure-devops&tabs=preview-page).

## Available tasks

Azure DevOps

- **Package**: package a VSTS extension into an extension package (.VSIX) file
- **Publish**: (optionally) package and publish an extension (either privately or publicly) to the Visual Studio Marketplace
- **Unpublish**: unpublish an extension from the Visual Studio Marketplace
- **Share**: share an extension with an Azure DevOps organisation
- **Install**: install an extension to an Azure DevOps organisation or Team Foundation Server
- **Query version**: query an extension's version (to make it easy to increment on your next package or publish)
- **Wait for validation**: waits for the Marketplace validation to come through.

Visual Studio

- **Publish**: Publish a Visual Studio extension to the Visual Studio Marketplace

### Required scopes

When creating a personal access token for use by your pipeline, make sure the token has at least the following scopes for the task(s) you are using:

- **Publish**: `All accessible organisations`, `Marketplace (publish)`
- **Unpublish**: `All accessible organisations`, `Marketplace (manage)`
- **Share**: `All accessible organisations`, `Marketplace (publish)`
- **Install**: `All accessible organisations` or a specific Organisation, `Extensions (read and manage)`, `Marketplace (acquire)`
- **Query Version**: `All accessible organisations`, `Marketplace (read)`
- **Is Valid**: `All accessible organisations`, `Marketplace (read)`

![Permissions](./Images/permissions.png)

## Get the source

The [source](https://github.com/Microsoft/azure-devops-extension-tasks) for this extension is on GitHub. Take, fork, and extend.

## Contribute

This extension was created by Microsoft with help from the community. We'd like to thank [Wouter de Kort](https://wouterdekort.com/), [Utkarsh Shigihalli](https://www.visualstudiogeeks.com/), [Jesse Houwing](https://jessehouwing.net/) for their contributions.

## Feedback and issues

If you have feedback or issues, please [send an email](mailto:jesse.houwing@xebia.com) or file an issue on [GitHub](https://github.com/Microsoft/azure-devops-extension-tasks/issues)
