(Get-ChildItem buildtasks\*\v*) | ForEach-Object{ 
    write-host $_
    Push-Location $_
    npm install @types/node@^20 --save-dev
    Pop-Location
}