SET SYSTEM_DEFAULTWORKINGDIRECTORY=E:\azure-devops-extension-tasks\

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

pushd BuildTasks\TfxInstaller\

set INPUT_VERSION=0.21.1
set INPUT_CHECKLATEST=true
node TfxInstaller\TfxInstaller.js

set INPUT_VERSION=0.21.x
set INPUT_CHECKLATEST=true
node TfxInstaller\TfxInstaller.js

set INPUT_VERSION=latest
set INPUT_CHECKLATEST=true
node TfxInstaller\TfxInstaller.js

set INPUT_VERSION=builtin
node TfxInstaller\TfxInstaller.js

popd
