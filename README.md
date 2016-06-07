![cistatus](https://mseng.visualstudio.com/_apis/public/build/definitions/b924d696-3eae-4116-8443-9a18392d8544/3646/badge)

# Build and release tasks for Team Services extensions

Tasks to help you simplify and automate the delivery of Team Services extensions. Package, publish, share, and install your Team Services extensions to the Visual Studio Marketplace.

## Tasks included

* **Package**: package a Team Services extension into an extension package (.VSIX) file
* **Publish**: optionally package and publish an extension (either privately or publicly) to the Visual Studio Marketplace
* **Share**: share an extension with a Team Services account
* **Install**: install an extension to a Team Services account
* **Query version**: query an extension's version (to make it easy to increment on your next package or publish)

[Learn more](https://marketplace.visualstudio.com/items?itemName=ms-devlabs.vsts-developer-tools-build-tasks) about this extension

## To contribute

1. From the root of the repo run `npm run initdev`. This will pull down the necessary modules and TypeScript declare files.
2. Run `npm run build:tasks` to compile the build tasks
3. Run `npm run package:tasks` to create a .vsix extension package that includes the build tasks

