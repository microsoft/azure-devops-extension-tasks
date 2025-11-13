SET SYSTEM_DEFAULTWORKINGDIRECTORY=D:\azure-devops-extension-tasks\
set INPUT_CWD=D:\azure-devops-extension-tasks\
set INPUT_ROOTFOLDER=D:\azure-devops-extension-tasks\
set INPUT_VSIXFILE=D:\azure-devops-extension-tasks\jessehouwing.vsts-developer-tools-build-tasks-5.0.0.vsix
SET INPUT_CONNECTTO=VsTeam
SET INPUT_FILETYPE=vsix
SET INPUT_EXTENSIONVISIBILITY=default
SET INPUT_EXTENSIONVERSION=3.26.23
SET INPUT_UPDATETASKSVERSION=true
SET INPUT_UPDATETASKSVERSIONTYPE=minor
SET INPUT_CONNECTEDSERVICENAME=A

SET INPUT_VERSION=builtin
set azdo_token=
SET ENDPOINT_URL_A=https://marketplace.visualstudio.com
SET ENDPOINT_AUTH_A={ "parameters": { "password": "%azdo_token%" }, "Scheme": "basic" }

set __TFXPATH=%~dp0BuildTasks\TfxInstaller\node_modules\.bin
set PATH=%__TFXPATH%;%PATH%

set NODE_ENV=production
set NO_UPDATE_NOTIFIER=true

set AGENT_WORKFOLDER=%temp%\agent\work
set AGENT_TOOLSDIRECTORY=%temp%\agent\tools
SET AGENT_TEMPDIRECTORY=%temp%\agent\tmp

md %temp%\agent
md %AGENT_WORKFOLDER%
md %AGENT_TOOLSDIRECTORY%
md %AGENT_TEMPDIRECTORY%

fnm use v20

cmd /c "npm run build:tasks"


pushd BuildTasks\PublishExtension\PublishExtension
node PublishExtension.js
popd