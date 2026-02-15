This extension provides Azure Pipelines tasks to package, publish, and manage Azure DevOps extensions in the [Visual Studio Marketplace](https://marketplace.visualstudio.com).

## How to use

After installing this extension in your Azure DevOps organization, add one or more tasks to your [Azure Pipelines YAML pipeline](https://learn.microsoft.com/azure/devops/pipelines/?view=azure-devops).

You can find an end-to-end example in this repository’s [azure-pipelines.yml](https://github.com/microsoft/azure-devops-extension-tasks/blob/main/azure-pipelines.yml).

![add-task](./Images/add-task.png)

For authenticated operations, you can use either a Personal Access Token (PAT) or Microsoft Entra ID Workload Identity Federation (OIDC).

- PAT setup: [Use personal access tokens](https://learn.microsoft.com/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops)
- OIDC setup guide: [Authentication and OIDC](https://github.com/microsoft/azure-devops-extension-tasks/blob/main/docs/authentication-and-oidc.md)

## Microsoft Entra ID Workload Federation (OIDC)

This extension supports Azure Pipelines service connections based on **Azure Resource Manager + Workload Identity Federation**.

- No long-lived PAT secret is required in your pipeline.
- Azure Pipelines requests short-lived tokens during the run.
- Use `connectionType: connectedService:AzureRM` for non-package operations.

For setup details, required marketplace resource scope, and troubleshooting, see:

- [Authentication and OIDC](https://github.com/microsoft/azure-devops-extension-tasks/blob/main/docs/authentication-and-oidc.md)
- [Azure Pipelines usage](https://github.com/microsoft/azure-devops-extension-tasks/blob/main/docs/azure-pipelines.md)

## Azure Pipelines tasks

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

### Required PAT scopes

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

![Permissions](./Images/permissions.png)

## GitHub Actions equivalent

This project also provides GitHub Actions equivalents for the same marketplace operations.

## Source, feedback, and issues

- Source: [microsoft/azure-devops-extension-tasks](https://github.com/microsoft/azure-devops-extension-tasks)
- Issues: [GitHub issues](https://github.com/microsoft/azure-devops-extension-tasks/issues)
