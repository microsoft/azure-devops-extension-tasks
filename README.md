![cistatus](https://mseng.visualstudio.com/_apis/public/build/definitions/b924d696-3eae-4116-8443-9a18392d8544/3646/badge)

# CI/CD Tools for VSTS extensions

This extension provides build and release tasks for packaging and publishing Visual Studio Team Services (VSTS) extensions to the [Visual Studio Marketplace](https://marketplace.visualstudio.com). There are also tasks to share and install your extension to your VSTS account.

## To use

[Learn more](https://marketplace.visualstudio.com/items?itemName=ms-devlabs.vsts-developer-tools-build-tasks) about this extension about and install the extension into your VSTS account via the Visual Studio Marketplace. 


## Available tasks

* **Package**: package a VSTS extension into an extension package (.VSIX) file
* **Publish**: optionally package and publish an extension (either privately or publicly) to the Visual Studio Marketplace
* **Share**: share an extension with a VSTS account
* **Install**: install an extension to a VSTS account
* **Query version**: query an extension's version (to make it easy to increment on your next package or publish)

## Contribute

1. From the root of the repo run `npm run initdev`. This will pull down the necessary modules and TypeScript declare files.
2. Run `npm run build:tasks` to compile the build tasks
3. Run `npm run package:tasks` to create a .vsix extension package that includes the build tasks

If you make a change to one or more of the actual tasks, you need to update the task(s) version in the appropriate task.json file. You can also run `setTaskVersion.js` and pass version to apply to all tasks, for example:

```
node scripts/setTaskVersion.js 1.1.44
```

