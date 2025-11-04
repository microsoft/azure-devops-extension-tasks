set INPUT_METHOD=id
set INPUT_PUBLISHERID=jessehouwing
set INPUT_EXTENSIONID=jessehouwing-vsts-variable-tasks-dev
set INPUT_EXTENSIONVERSION=3.0.1122
SET INPUT_CONNECTEDSERVICENAME=A
SET INPUT_VERSION=builtin
set azdo_token=
SET ENDPOINT_URL_A=https://marketplace.visualstudio.com
SET ENDPOINT_AUTH_A={ "parameters": { "password": "%azdo_token%" }, "Scheme": "basic" }

set AGENT_WORKFOLDER=%temp%\agent\work
set AGENT_TOOLSDIRECTORY=%temp%\agent\tools
SET AGENT_TEMPDIRECTORY=%temp%\agent\tmp
set __TFXPATH=E:\azure-devops-extension-tasks\BuildTasks\TfxInstaller\v5\node_modules\.bin
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


echo.
echo ========================================
echo Testing IsValidExtension v5
echo ========================================
pushd BuildTasks\IsValidExtensionAgent\v5\IsValidExtensionAgent\v5
node IsValidExtension.js
popd


echo.
echo ========================================
echo Testing IsValidExtension v5 with TFX_TRACE=1
echo ========================================
pushd BuildTasks\IsValidExtensionAgent\v5\IsValidExtensionAgent\v5
node IsValidExtension.js
popd
set TFX_TRACE=
