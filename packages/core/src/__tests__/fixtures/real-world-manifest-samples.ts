/**
 * Real-world manifest samples copied from user-provided files in tmp/ for future reference.
 *
 * Provenance:
 * - tmp/vss-extension.json
 * - tmp/extension.vsixmanifest
 * - tmp/extension.vsomanifest
 */

export const REAL_WORLD_VSS_EXTENSION_JSON = {
  manifestVersion: 1,
  id: 'jessehouwing-vsts-msbuild-helper-task',
  name: 'MsBuild Helper Tasks',
  version: '1.0.0',
  publisher: 'jessehouwing',
  targets: [
    {
      id: 'Microsoft.VisualStudio.Services',
    },
  ],
  scope: ['vso.build'],
  description: 'Task to help you set those pesky MsBuild Properties.',
  categories: ['Azure Pipelines'],
  tags: [
    'Extension',
    'Build',
    'Variable',
    'Property',
    'Code Analysis',
    'Layer Validation',
    'Template',
    'xebia',
  ],
  screenshots: [
    {
      path: 'extension/Images/Screenshots/add-task.png',
    },
    {
      path: 'extension/Images/Screenshots/setup.png',
    },
    {
      path: 'extension/Images/Screenshots/configure-msbuild.png',
    },
  ],
  content: {
    details: {
      path: 'readme.md',
    },
    license: {
      path: 'LICENSE.md',
    },
    privacy: {
      path: 'PRIVACY.md',
    },
  },
  links: {
    getstarted: {
      uri: 'https://github.com/jessehouwing/azure-pipelines-msbuild-helper-task/wiki',
    },
    support: {
      uri: 'https://github.com/jessehouwing/azure-pipelines-msbuild-helper-task/issues',
    },
    license: {
      uri: 'https://github.com/jessehouwing/azure-pipelines-msbuild-helper-task/LICENSE.md',
    },
    privacypolicy: {
      uri: 'https://github.com/jessehouwing/azure-pipelines-msbuild-helper-task/blob/master/PRIVACY.md',
    },
  },
  badges: [
    {
      href: 'https://github.com/sponsors/jessehouwing',
      uri: 'https://img.shields.io/github/sponsors/jessehouwing',
      description: 'GitHub Sponsors',
    },
  ],
  repository: {
    type: 'git',
    uri: 'https://github.com/jessehouwing/azure-pipelines-msbuild-helper-task',
  },
  branding: {
    color: 'rgb(36, 43, 50)',
    theme: 'dark',
  },
  icons: {
    default: 'extension/images/extension-icon.png',
  },
  files: [
    {
      path: 'vsts-msbuild-helper/v0/vsts-msbuild-helper.js',
    },
    {
      path: 'vsts-msbuild-helper/v0/node_modules',
    },
    {
      path: 'vsts-msbuild-helper/v0/task.json',
    },
    {
      path: 'vsts-msbuild-helper/v0/icon.png',
    },
    {
      path: 'vsts-msbuild-helper/v1/vsts-msbuild-helper.js',
    },
    {
      path: 'vsts-msbuild-helper/v1/node_modules',
    },
    {
      path: 'vsts-msbuild-helper/v1/task.json',
    },
    {
      path: 'vsts-msbuild-helper/v1/icon.png',
    },
  ],
  contributions: [
    {
      id: 'vsts-msbuild-helper',
      type: 'ms.vss-distributed-task.task',
      targets: ['ms.vss-distributed-task.tasks'],
      properties: {
        name: 'vsts-msbuild-helper',
      },
    },
  ],
};

export const REAL_WORLD_EXTENSION_VSIXMANIFEST_XML = `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="jessehouwing-vsts-msbuild-helper-task" Version="1.0.0" Publisher="jessehouwing"/>
    <DisplayName>MsBuild Helper Tasks</DisplayName>
    <Description xml:space="preserve">Task to help you set those pesky MsBuild Properties.</Description>
    <Categories>Azure Pipelines</Categories>
    <Tags>Extension,Build,Variable,Property,Code Analysis,Layer Validation,Template,xebia</Tags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Services.Links.Getstarted" Value="https://github.com/jessehouwing/azure-pipelines-msbuild-helper-task/wiki"/>
      <Property Id="Microsoft.VisualStudio.Services.Links.Support" Value="https://github.com/jessehouwing/azure-pipelines-msbuild-helper-task/issues"/>
      <Property Id="Microsoft.VisualStudio.Services.Links.License" Value="https://github.com/jessehouwing/azure-pipelines-msbuild-helper-task/LICENSE.md"/>
      <Property Id="Microsoft.VisualStudio.Services.Links.Privacypolicy" Value="https://github.com/jessehouwing/azure-pipelines-msbuild-helper-task/blob/master/PRIVACY.md"/>
      <Property Id="Microsoft.VisualStudio.Services.Links.GitHub" Value="https://github.com/jessehouwing/azure-pipelines-msbuild-helper-task"/>
      <Property Id="Microsoft.VisualStudio.Services.Branding.Color" Value="#242b32"/>
      <Property Id="Microsoft.VisualStudio.Services.Branding.Theme" Value="dark"/>
    </Properties>
    <Badges>
      <Badge Link="https://github.com/sponsors/jessehouwing" ImgUri="https://img.shields.io/github/sponsors/jessehouwing" Description="GitHub Sponsors"/>
    </Badges>
    <License>LICENSE.md</License>
    <Icon>extension/images/extension-icon.png</Icon>
  </Metadata>
  <Dependencies/>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Services"/>
  </Installation>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Services.Screenshots.1" d:Source="File" Path="extension/Images/Screenshots/add-task.png" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Screenshots.2" d:Source="File" Path="extension/Images/Screenshots/setup.png" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Screenshots.3" d:Source="File" Path="extension/Images/Screenshots/configure-msbuild.png" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" d:Source="File" Path="readme.md" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Content.License" d:Source="File" Path="LICENSE.md" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Content.Privacy" d:Source="File" Path="PRIVACY.md" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Icons.Default" d:Source="File" Path="extension/images/extension-icon.png" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Manifest" d:Source="File" Path="extension.vsomanifest" Addressable="true"/>
  </Assets>
</PackageManifest>`;

export const REAL_WORLD_EXTENSION_VSOMANIFEST_JSON = {
  manifestVersion: 1,
  scope: ['vso.build'],
  badges: [
    {
      href: 'https://github.com/sponsors/jessehouwing',
      uri: 'https://img.shields.io/github/sponsors/jessehouwing',
      description: 'GitHub Sponsors',
    },
  ],
  repository: {
    type: 'git',
    uri: 'https://github.com/jessehouwing/azure-pipelines-msbuild-helper-task',
  },
  contributions: [
    {
      id: 'vsts-msbuild-helper',
      type: 'ms.vss-distributed-task.task',
      targets: ['ms.vss-distributed-task.tasks'],
      properties: {
        name: 'vsts-msbuild-helper',
      },
    },
  ],
  scopes: [] as string[],
  contributionTypes: [] as Array<Record<string, unknown>>,
};
