$ErrorActionPreference = 'Stop'

$isWindowsOs = $false
if ($env:OS -eq 'Windows_NT') {
  $isWindowsOs = $true
} else {
  try {
    $isWindowsOs = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)
  } catch {
    $isWindowsOs = $false
  }
}

if (-not $isWindowsOs) {
  Write-Host 'This script only applies to Windows environments.'
  exit 0
}

$pathsToAdd = @()

try {
  $pythonScriptsPath = (python -c "import sysconfig; print(sysconfig.get_path('scripts', 'nt_user'))" 2>$null).Trim()
  if ($pythonScriptsPath) {
    $pathsToAdd += $pythonScriptsPath
  }
} catch {
  Write-Host 'Python not found while resolving scripts path; skipping Python Scripts path.'
}

try {
  $goPath = (go env GOPATH 2>$null).Trim()
  if ($goPath) {
    $goBinPath = Join-Path $goPath 'bin'
    $pathsToAdd += $goBinPath
  }
} catch {
  Write-Host 'Go not found while resolving GOPATH; skipping Go bin path.'
}

$pathsToAdd = $pathsToAdd | Where-Object { $_ -and $_.Trim().Length -gt 0 } | Select-Object -Unique

if (-not $pathsToAdd -or $pathsToAdd.Count -eq 0) {
  Write-Host 'No paths discovered to add.'
  exit 0
}

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$userPathEntries = @()
if ($userPath) {
  $userPathEntries = $userPath.Split(';') | Where-Object { $_ -and $_.Trim().Length -gt 0 }
}

$updated = $false
foreach ($pathToAdd in $pathsToAdd) {
  $exists = $userPathEntries | Where-Object { $_.TrimEnd('\\') -ieq $pathToAdd.TrimEnd('\\') }
  if (-not $exists) {
    $userPathEntries += $pathToAdd
    $updated = $true
    Write-Host "Added to User PATH: $pathToAdd"
  } else {
    Write-Host "Already in User PATH: $pathToAdd"
  }

  if (-not (($env:Path.Split(';') | Where-Object { $_.TrimEnd('\\') -ieq $pathToAdd.TrimEnd('\\') }))) {
    $env:Path += ";$pathToAdd"
  }
}

if ($updated) {
  [Environment]::SetEnvironmentVariable('Path', ($userPathEntries -join ';'), 'User')
  Write-Host 'User PATH updated. Open a new terminal to pick up persisted PATH changes.'
} else {
  Write-Host 'User PATH already contained all required entries.'
}
