SET SYSTEM_DEFAULTWORKINGDIRECTORY=E:\azure-devops-extension-tasks\
set INPUT_CWD=E:\azure-devops-extension-tasks\
set INPUT_ROOTFOLDER=E:\azure-devops-extension-tasks\
set INPUT_VSIXFILE=E:\azure-devops-extension-tasks\ms-devlabs.vsts-developer-tools-build-tasks-5.0.0.vsix
SET INPUT_CONNECTTO=VsTeam
SET INPUT_FILETYPE=vsix
SET INPUT_EXTENSIONVISIBILITY=default
SET INPUT_EXTENSIONVERSION=3.26.23
SET INPUT_UPDATETASKSVERSION=true
SET INPUT_UPDATETASKSVERSIONTYPE=minor
SET INPUT_CONNECTEDSERVICENAME=A
SET ENDPOINT_URL_A=https://marketplace.visualstudio.com
SET ENDPOINT_AUTH_A={ "parameters": { "apitoken": "token", "username": "user", "password": "password" }, "Scheme": "basic" }

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

set __TFXPATH=C:\Users\JESSEH~1\AppData\Local\Temp\agent\tools\tfx\0.18.0\x64\

pushd BuildTasks\PublishExtension\v5\PublishExtension\v5
node PublishExtension.js
popd