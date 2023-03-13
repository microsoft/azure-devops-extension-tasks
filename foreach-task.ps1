(Get-ChildItem buildtasks\*\v4) | ForEach-Object{ 
    write-host $_
    Push-Location $_
    & npm install azure-pipelines-task-lib@^4 --save
    Pop-Location
}