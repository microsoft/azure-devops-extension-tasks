set INPUT_EXTENSIONID=ext
set INPUT_EXTENSIONVERSION=8.9.10
set INPUT_PUBLISHERID=me
set INPUT_ROOTFOLDER=C:\Users\JesseHouwing\Source\Repos\vsts-ping-task-demo
set INPUT_UPDATETASKSID=true
set INPUT_UPDATETASKSVERSION=true
set INPUT_UPDATETASKSVERSIONTYPE=minor

set AGENT_WORKFOLDER=c:\temp

cmd /c "npm run build:tasks"

pushd dist\BuildTasks\PackageExtension
node packageextension.js
popd