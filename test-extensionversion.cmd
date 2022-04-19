set INPUT_EXTENSIONID=vsts-ensure-tests-tasks
set INPUT_EXTENSIONVERSION=8.9.10
set INPUT_PUBLISHERID=jessehouwing
set INPUT_ROOTFOLDER=C:\Users\jesse\source\repos\vsts-ping-task-demo
set INPUT_UPDATETASKSID=true
set INPUT_UPDATETASKSVERSION=true
set INPUT_UPDATETASKSVERSIONTYPE=minor
SET INPUT_CONNECTEDSERVICENAME=A
SET ENDPOINT_URL_A=https://marketplace.visualstudio.com
SET ENDPOINT_AUTH_A={ "parameters": { "apitoken": "token", "username": "user", "password": "password" }, "Scheme": "basic" }

set AGENT_WORKFOLDER=%temp%

set NODE_ENV=production
set NO_UPDATE_NOTIFIER=true

cmd /c "npm run build:tasks"

pushd BuildTasks\TfxInstaller\TfxInstaller
node TfxInstaller.js
popd

set __TFXPATH=c:\temp\agent\tools\tfx\0.7.11\x64


pushd BuildTasks\ExtensionVersion\ExtensionVersion
node ExtensionVersion.js
popd