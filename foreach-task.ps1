(Get-ChildItem buildtasks\*\v5) | ForEach-Object{ 
    write-host $_
    Push-Location $_
    $task = gc -raw task.json | convertfrom-json -AsHashtable
    $task.preview = $true
    $task | convertto-json -depth 100 | set-content task.json
    Pop-Location
}