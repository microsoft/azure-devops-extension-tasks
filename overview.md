
This extension provides build and release tasks for packaging and publishing Visual Studio Team Services (VSTS) extensions to the [Visual Studio Marketplace](https://marketplace.visualstudio.com). There are also tasks to share and install your extension to your VSTS account.

## What you can do

* **Package**: package a VSTS extension into an extension package (.VSIX) file
* **Publish**: publish an extension (either privately or publicly) to the Visual Studio Marketplace
* **Share**: share a private extension with a VSTS account so it can be installed
* **Install**: install an extension to a VSTS account
* **Query version**: query an extension's version (to make it easy to increment on your next package or publish)

## How to use

After installing the extension, you can add one (or more) of the tasks to a new or existing [build definition](https://www.visualstudio.com/en-us/docs/build/define/create) or [release definition](https://www.visualstudio.com/en-us/docs/release/author-release-definition/more-release-definition)

![add-task](add-task.png)

If you plan to publish to the Marketplace, you will need to [create a personal access token](https://www.visualstudio.com/docs/setup-admin/team-services/use-personal-access-tokens-to-authenticate). 
 
### Required scopes
 
 When creating a personal access token for use by your build/release, make sure the token has at least the following scopes for the task(s) you are using:

 * **Publish**: All Accounts, `Marketplace (publish)`
 * **Share**: All Accounts, `Marketplace (publish)`
 * **Install**: All Accounts or a Specific Account, `Extensions (read and manage)`, `Marketplace`
 * **Query Version**: All Accounts, `Marketplace`
 
## Get the source

The [source](https://github.com/Microsoft/vsts-extension-build-release-tasks) for this extension is on GitHub. Take, fork, and extend.

## Contribute

This extension was created by Microsoft with help from the community. We'd like to thank Wouter de Kort and Jesse Houwing for their contributions.

## Feedback and issues

If you have feedback or issues, please [send an email](mailto:vsointegration@microsoft.com) or file an issue on [GitHub](https://github.com/Microsoft/vsts-extension-build-release-tasks/issues)