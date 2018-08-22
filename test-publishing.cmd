SET AGENT_WORKFOLDER=c:\temp
SET SYSTEM_DEFAULTWORKINGDIRECTORY=C:\Users\JesseHouwing\Source\Repos\vsts-ping-task-demo
set INPUT_CWD=C:\Users\JesseHouwing\Source\Repos\vsts-ping-task-demo
set INPUT_ROOTFOLDER=C:\Users\JesseHouwing\Source\Repos\vsts-ping-task-demo
SET INPUT_CONNECTTO=VsTeam
SET INPUT_FILETYPE=vsix
SET INPUT_EXTENSIONVISIBILITY=default
SET INPUT_EXTENSIONVERSION=1.2.3
SET INPUT_UPDATETASKSVERSION=true
SET INPUT_UPDATETASKSVERSIONTYPE=major
SET INPUT_CONNECTEDSERVICENAME=A
SET ENDPOINT_URL_A=https://marketplace.visualstudio.com
SET ENDPOINT_AUTH_A={ "parameters": { "apitoken": "token", "username": "user", "password": "password" }, "Scheme": "basic" }
SET INPUT_VSIXFILE=C:\Users\JesseHouwing\Source\Repos\vsts-ping-task-demo\jessehouwing.jessehouwing-vsts-ping-task-2.1.2.vsix

set NODE_ENV=production
set NO_UPDATE_NOTIFIER=true

cmd /c "npm run build:tasks"

pushd BuildTasks\PublishExtension\PublishExtension
c:\TfsData\jessehouwing\externals.2.111.1\node\bin\node.exe PublishExtension.js
c:\TfsData\jessehouwing\externals.2.136.1\node\bin\node.exe PublishExtension.js
node PublishExtension.js
popd