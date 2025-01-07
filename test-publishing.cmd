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

set AGENT_WORKFOLDER=%temp%\agent\work
set AGENT_TOOLSDIRECTORY=%temp%\agent\tools
SET AGENT_TEMPDIRECTORY=%temp%\agent\tmp

md %temp%\agent
md %AGENT_WORKFOLDER%
md %AGENT_TOOLSDIRECTORY%
md %AGENT_TEMPDIRECTORY%

fnm use v16

cmd /c "npm run build:tasks"

set __TFXPATH=C:\Users\JESSEH~1\AppData\Local\Temp\agent\tools\tfx\0.18.0\x64\

pushd BuildTasks\PublishExtension\v4\PublishExtension\v4
SET PREVIEW_FAST_UPDATE=false
node PublishExtension.js

SET PREVIEW_FAST_UPDATE=true
node PublishExtension.js
popd