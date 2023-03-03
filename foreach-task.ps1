(Get-ChildItem buildtasks\*\v*) | ForEach-Object{ 
    write-host $_
    Push-Location $_
    snyk ignore --id=SNYK-JS-MOCKERY-3043117
    Pop-Location
}