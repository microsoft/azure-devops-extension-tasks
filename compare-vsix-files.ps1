# PowerShell script to compare files in two VSIX packages
# Compares ms-devlabs.vsts-developer-tools-build-tasks-5.0.0.vsix (source)
# against ms-devlabs.vsts-developer-tools-build-tasks-5.0.0-signed.vsix (signed)
# and shows files missing from the signed version

param(
    [string]$SourceVsix = "ms-devlabs.vsts-developer-tools-build-tasks-5.0.0-unsigned.vsix",
    [string]$SignedVsix = "ms-devlabs.vsts-developer-tools-build-tasks-5.0.0.vsix"
)

if (-not (Test-Path $SourceVsix) -or -not (Test-Path $SignedVsix)) {
    $erroractionpreference = "silentlycontinue"
    del BuildTasks\PublishExtension\v5\node_modules\7zip-bin\linux -recurse
    del BuildTasks\PublishExtension\v5\node_modules\7zip-bin\mac -recurse
    del -include @(
        "package-lock.json",
        "*.ts",
        ".taskkey",
        "tsconfig.json",
        ".snyk",
        "*.md",
        "tsconfig.tsbuildinfo"
    ) -recurse BuildTasks\*\v*

    del -include @(
            ".package-lock.json",
            "*.map",
            ".github",
            "@types",
            ".eslintrc",
            ".nycrc",
            "fixtures",
            "test",
            "tests",
            ".editorconfig",
            ".travis.yml",
            ".jshintrc",
            ".jscsrc",
            "CODEOWNERS",
            "doc",
            "CHANGELOG",
            "Makefile",
            "LICENSE-MIT",
            "LICENSE",
            "license",
            "AUTHORS"
        ) -recurse BuildTasks\*\v*\node_modules -force  
    $erroractionpreference = "stop"

    & npx tfx-cli extension create
    copy $SignedVsix $SourceVsix
    & ./vsixsigntool.exe sign /f MinimalCert.pfx /p 1 $SignedVsix
}

# Function to get file list from VSIX (which is a ZIP file)
function Get-VsixFileList {
    param([string]$VsixPath)
    
    try {
        # VSIX files are ZIP files, so we can use .NET's ZipFile class
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = [System.IO.Compression.ZipFile]::OpenRead($VsixPath)
        $fileHash = @{}
        
        foreach ($entry in $zip.Entries) {
            if (-not $entry.FullName.EndsWith('/')) {  # Skip directories
                $fileHash[$entry.FullName] = $true
            }
        }
        
        $zip.Dispose()
        return $fileHash
    }
    catch {
        Write-Error "Failed to read VSIX file '$VsixPath': $($_.Exception.Message)"
        return @{}
    }
}

# Check if both files exist
if (-not (Test-Path $SourceVsix)) {
    Write-Error "Source VSIX file not found: $SourceVsix"
    exit 1
}

if (-not (Test-Path $SignedVsix)) {
    Write-Error "Signed VSIX file not found: $SignedVsix"
    exit 1
}

Write-Host "Comparing VSIX files..." -ForegroundColor Green
Write-Host "Source: $SourceVsix" -ForegroundColor Cyan
Write-Host "Signed: $SignedVsix" -ForegroundColor Cyan
Write-Host

# Get file lists from both VSIX files
Write-Host "Extracting file list from source VSIX..." -ForegroundColor Yellow
$sourceFiles = Get-VsixFileList -VsixPath $SourceVsix

Write-Host "Extracting file list from signed VSIX..." -ForegroundColor Yellow
$signedFiles = Get-VsixFileList -VsixPath $SignedVsix

if ($sourceFiles.Count -eq 0 -or $signedFiles.Count -eq 0) {
    Write-Error "Failed to extract file lists from one or both VSIX files"
    exit 1
}

Write-Host
Write-Host "File counts:" -ForegroundColor Green
Write-Host "  Source VSIX: $($sourceFiles.Count) files" -ForegroundColor White
Write-Host "  Signed VSIX: $($signedFiles.Count) files" -ForegroundColor White
Write-Host

# Find files missing from signed VSIX
$missingFiles = $sourceFiles.Keys | Where-Object { -not $signedFiles.ContainsKey($_) }

$extensionManifest = get-content -raw "vss-extension.json" | ConvertFrom-Json

if ($missingFiles.Count -eq 0) {
    Write-Host "✅ No files are missing from the signed VSIX!" -ForegroundColor Green
} else {
    Write-Host "❌ Files missing from signed VSIX ($($missingFiles.Count) files):" -ForegroundColor Red
    Write-Host
    foreach ($file in $missingFiles) {
        Write-Host "  - $file" -ForegroundColor Red

        # Add missing file to the extension manifest and set contentType to "application/octet-stream"
        $extensionManifest.files += @{ path = $file; contentType = "application/octet-stream" }
    }
}
# write the updated extension manifest back to the file
$extensionManifest | ConvertTo-Json -Depth 100 | set-content "vss-extension.json"

# Optional: Show files that are only in signed VSIX (additions)
$addedFiles = $signedFiles.Keys | Where-Object { -not $sourceFiles.ContainsKey($_) }

if ($addedFiles.Count -gt 0) {
    Write-Host
    Write-Host "ℹ️  Files added to signed VSIX ($($addedFiles.Count) files):" -ForegroundColor Blue
    foreach ($file in $addedFiles) {
        Write-Host "  + $file" -ForegroundColor Blue
    }
}

Write-Host
Write-Host "Comparison complete!" -ForegroundColor Green

# Return exit code based on whether files are missing
if ($missingFiles.Count -gt 0) {
    exit 1
} else {
    exit 0
}
