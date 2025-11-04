set INPUT_VERSION=v0.7.x
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

pushd BuildTasks\TfxInstaller\v5\TfxInstaller\v5
node TfxInstaller.js
popd

set __TFXPATH=C:\Users\JESSEH~1\AppData\Local\Temp\agent\tools\tfx\0.18.0\x64\
set INPUT_EXTENSIONID=ext
set INPUT_EXTENSIONVERSION=8.9.10


set INPUT_ROOTFOLDER=C:\Users\jesse\source\repos\vsts-ping-task-demo
set INPUT_UPDATETASKSID=true
set INPUT_UPDATETASKSVERSION=true
set INPUT_UPDATETASKSVERSIONTYPE=minor
set INPUT_PATTERNMANIFEST=vss-extension*.json
pushd BuildTasks\PackageExtension\v5\PackageExtension\v5
node PackageExtension.js
popd