SET AGENT_WORKFOLDER=%temp%
SET SYSTEM_DEFAULTWORKINGDIRECTORY=C:\Users\JesseHouwing\source\azure-pipelines-variable-tasks\
set INPUT_CWD=C:\Users\JesseHouwing\source\azure-pipelines-variable-tasks\
set INPUT_ROOTFOLDER=C:\Users\JesseHouwing\source\azure-pipelines-variable-tasks\
set INPUT_VSIXFILE=C:\Users\JesseHouwing\source\azure-pipelines-variable-tasks\jessehouwing.jessehouwing-vsts-variable-tasks-3.0.0.vsix
SET INPUT_CONNECTTO=VsTeam
SET INPUT_FILETYPE=vsix
SET INPUT_EXTENSIONVISIBILITY=default
SET INPUT_EXTENSIONVERSION=3.26.27
SET INPUT_UPDATETASKSVERSION=true
SET INPUT_UPDATETASKSVERSIONTYPE=minor
SET INPUT_CONNECTEDSERVICENAME=A
SET ENDPOINT_URL_A=https://marketplace.visualstudio.com
SET ENDPOINT_AUTH_A={ "parameters": { "apitoken": "token", "username": "user", "password": "password" }, "Scheme": "basic" }

set NODE_ENV=production
set NO_UPDATE_NOTIFIER=true

fnm use v16

cmd /c "npm run build:tasks"

set __TFXPATH=C:\Users\JesseHouwing\AppData\Local\fnm_multishells\5548_1672346643184

pushd BuildTasks\PublishExtension\v4\PublishExtension\v4
SET PREVIEW_FAST_UPDATE=false
node PublishExtension.js

SET PREVIEW_FAST_UPDATE=true
node PublishExtension.js
popd