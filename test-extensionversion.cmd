set INPUT_EXTENSIONID=vsts-ensure-tests-tasks
set INPUT_EXTENSIONVERSION=8.9.10
set INPUT_PUBLISHERID=jessehouwing
set INPUT_ROOTFOLDER=C:\Users\jesse\source\repos\vsts-ping-task-demo
set INPUT_UPDATETASKSID=true
set INPUT_UPDATETASKSVERSION=true
set INPUT_UPDATETASKSVERSIONTYPE=minor
SET INPUT_CONNECTEDSERVICENAME=A
SET INPUT_VERSION=0.x
SET ENDPOINT_URL_A=https://marketplace.visualstudio.com
SET ENDPOINT_AUTH_A={ "parameters": { "apitoken": "token", "username": "user", "password": "password" }, "Scheme": "basic" }

set AGENT_WORKFOLDER=%temp%\agent\work
set AGENT_TOOLSDIRECTORY=%temp%\agent\tools
SET AGENT_TEMPDIRECTORY=%temp%\agent\tmp

md %temp%\agent
md %AGENT_WORKFOLDER%
md %AGENT_TOOLSDIRECTORY%
md %AGENT_TEMPDIRECTORY%

set NODE_ENV=production
set NO_UPDATE_NOTIFIER=true

REM cmd /c "npm run build:tasks"

pushd BuildTasks\TfxInstaller\v5\TfxInstaller\v5
node TfxInstaller.js
popd


pushd BuildTasks\ExtensionVersion\v5\ExtensionVersion\v5
node ExtensionVersion.js
popd