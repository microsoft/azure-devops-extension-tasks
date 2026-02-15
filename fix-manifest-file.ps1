# PowerShell script to fix the vss-extension.json manifest file
# 1. Remove files with explicit contentType of "application/octet-stream"
# 2. Add files without extensions from BuildTasks\* folders to the manifest

Write-Host "Processing vss-extension.json manifest file..." -ForegroundColor Green

# Read the vss-extension.json file
if (-not (Test-Path "vss-extension.json")) {
    Write-Error "vss-extension.json file not found in current directory"
    exit 1
}

$extensionManifest = Get-Content -Raw "vss-extension.json" | ConvertFrom-Json
$repoRoot = (Get-Location).Path

Write-Host "Original file count in manifest: $($extensionManifest.files.Count)" -ForegroundColor Cyan

# Remove files with explicit contentType of "application/octet-stream"
$originalCount = $extensionManifest.files.Count
$extensionManifest.files = $extensionManifest.files | Where-Object { 
    $_.contentType -ne "application/octet-stream" 
}
$removedCount = $originalCount - $extensionManifest.files.Count

Write-Host "Removed $removedCount files with contentType 'application/octet-stream'" -ForegroundColor Yellow

# Get all files in BuildTasks folders referenced by the manifest
$manifestTaskDirectories = $extensionManifest.files |
    Where-Object { $_.path -like "packages/*" } |
    ForEach-Object {
        $fullPath = Join-Path -Path $repoRoot -ChildPath ($_.path -replace '/', '\')
        if (Test-Path -LiteralPath $fullPath -PathType Container) {
            $fullPath
        }
    } |
    Sort-Object -Unique

$buildTasksFiles = @()

if ($manifestTaskDirectories.Count -eq 0) {
    Write-Host "No BuildTasks directories referenced in manifest; skipping scan." -ForegroundColor Yellow
} else {
    Write-Host "Scanning BuildTasks folders referenced in manifest for files without extensions..." -ForegroundColor Yellow

    $buildTasksFiles = $manifestTaskDirectories | ForEach-Object {
        Get-ChildItem -Path $_ -File -Recurse
    } | Where-Object {
        # Select files that don't have an extension (no dot in the name or ends with a dot)
        $_.Name -notmatch '\.[^.]+$' -or $_.Name.EndsWith('.')
    }
}

Write-Host "Found $($buildTasksFiles.Count) files without extensions" -ForegroundColor Cyan

# Get existing file paths from manifest for comparison (using hashtable for performance)
$existingFilePaths = @{}
foreach ($file in $extensionManifest.files) {
    if ($file.path) {
        $existingFilePaths[$file.path] = $true
    }
}

# Add files without extensions to the manifest if they're not already there
$addedCount = 0
foreach ($file in $buildTasksFiles) {
    $relativePath = $file.FullName.Substring($repoRoot.Length + 1).Replace('\', '/')
    
    if (-not $existingFilePaths.ContainsKey($relativePath)) {
        $extensionManifest.files += @{
            path = $relativePath
            contentType = "application/octet-stream"
        }
        $addedCount++
        Write-Host "  + Added: $relativePath" -ForegroundColor Green
    }
}

Write-Host "Added $addedCount new files without extensions to manifest" -ForegroundColor Green

# Write the updated manifest back to disk
Write-Host "Writing updated manifest to vss-extension.json..." -ForegroundColor Yellow

$extensionManifest | ConvertTo-Json -Depth 100 | Set-Content "vss-extension.json"

Write-Host "Final file count in manifest: $($extensionManifest.files.Count)" -ForegroundColor Cyan
Write-Host "Manifest update complete!" -ForegroundColor Green