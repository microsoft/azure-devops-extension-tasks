(Get-ChildItem buildtasks\*\v*) | ForEach-Object{ 
    write-host $_
    Push-Location $_
    npm audit
    Pop-Location
}