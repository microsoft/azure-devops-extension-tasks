set INPUT_VERSION=builtin
set INPUT_PUBLISHERID=meA

set AGENT_VERSION=2.211.2
set AGENT_WORKFOLDER=%temp%\agent\work
set AGENT_TOOLSDIRECTORY=%temp%\agent\tools
SET AGENT_TEMPDIRECTORY=%temp%\agent\tmp

md %temp%\agent
md %AGENT_WORKFOLDER%
md %AGENT_TOOLSDIRECTORY%
md %AGENT_TEMPDIRECTORY%

set NODE_ENV=production
set NO_UPDATE_NOTIFIER=true

cmd /c "npm run build:tasks"

pushd BuildTasks\TfxInstaller\TfxInstaller
node TfxInstaller.js
popd

set __TFXPATH=%~dp0BuildTasks\TfxInstaller\node_modules\.bin
set PATH=%__TFXPATH%;%PATH%
set INPUT_EXTENSIONID=ext
set INPUT_EXTENSIONVERSION=8.9.10


set INPUT_ROOTFOLDER=D:\azure-devops-extension-tasks\
set INPUT_UPDATETASKSID=true
set INPUT_UPDATETASKSVERSION=true
set INPUT_UPDATETASKSVERSIONTYPE=minor
set INPUT_PATTERNMANIFEST=vss-extension.json
pushd BuildTasks\PackageExtension\PackageExtension
node PackageExtension.js
popd