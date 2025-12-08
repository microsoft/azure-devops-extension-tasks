
(Get-ChildItem buildtasks\* -Directory) | ForEach-Object { 
    write-host $_
    Push-Location $_
    #if ((gc -raw .\package.json -ErrorAction Ignore) -like "*@types/node*") { 
    #    npm install @types/node@^20.19.23 --save-dev
    #}
    npm audit fix
    Pop-Location
}