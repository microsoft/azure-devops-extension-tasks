set INPUT_VERSION=v0.7.x

set AGENT_WORKFOLDER=c:\temp\agent\work
set AGENT_TOOLSDIRECTORY=c:\temp\agent\tools
set AGENT_TEMPDIRECTORY=c:\temp\agent\temp
set AGENT_VERSION=2.211.2

set NODE_ENV=production
set NO_UPDATE_NOTIFIER=true

cmd /c "npm run build:tasks"

pushd BuildTasks\TfxInstaller\TfxInstaller
node TfxInstaller.js
popd

set __TFXPATH=c:\temp\agent\tools\tfx\0.7.11\x64
set INPUT_EXTENSIONID=ext
set INPUT_EXTENSIONVERSION=8.9.10
set INPUT_PUBLISHERID=meXXX
set INPUT_ROOTFOLDER=C:\Users\jesse\source\repos\vsts-ping-task-demo
set INPUT_UPDATETASKSID=true
set INPUT_UPDATETASKSVERSION=true
set INPUT_UPDATETASKSVERSIONTYPE=minor
set INPUT_PATTERNMANIFEST=vss-extension*.json
pushd BuildTasks\PackageExtension\PackageExtension
rem c:\TfsData\jessehouwing\externals.2.111.1\node\bin\node.exe PackageExtension.js
rem c:\TfsData\jessehouwing\externals.2.136.1\node\bin\node.exe PackageExtension.js
node PackageExtension.js
popd