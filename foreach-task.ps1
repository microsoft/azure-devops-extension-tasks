(Get-ChildItem buildtasks\*\v*) | ForEach-Object{ 
    write-host $_
    Push-Location $_
    rmdir .\node_modules -Recurse -Force
    Pop-Location
}