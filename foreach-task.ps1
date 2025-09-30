(Get-ChildItem buildtasks\*\v*) | ForEach-Object { 
    write-host $_
    Push-Location $_
    if ((gc -raw .\package.json -ErrorAction Ignore) -like "*@types/node*") { 
        npm install @types/node@^20 --save-dev
    }
    Pop-Location
}