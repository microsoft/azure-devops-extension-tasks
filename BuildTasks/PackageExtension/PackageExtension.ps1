param (
    [string]$rootFolder,
    [string]$patternManifest,
    [string]$outputPath,
    [string]$arguments,
    [string]$cwd    
)

# Import the Task.Common and Task.Internal dll that has all the cmdlets we need for Build
import-module "Microsoft.TeamFoundation.DistributedTask.Task.Internal"
import-module "Microsoft.TeamFoundation.DistributedTask.Task.Common"

# try to find vset in the path
$vset = Get-Command -Name vset -ErrorAction Ignore

if(!$vset)
{
    Write-Verbose "try to find vset in the node_modules in the sources directory"
    $buildSourcesDirectory = Get-TaskVariable -Context $distributedTaskContext -Name "Build.SourcesDirectory"
    $nodeBinPath = Join-Path -Path $buildSourcesDirectory -ChildPath 'node_modules\.bin'

    if(Test-Path -Path $nodeBinPath -PathType Container)
    {
        $vsetPath = Join-Path -Path $nodeBinPath -ChildPath "vset.cmd"
        Write-Verbose "Looking for vset.cmd in $vsetPath"
        $vset = Get-Command -Name $vsetPath -ErrorAction Ignore
    }
    else
    {
        Write-Verbose "Recursively searching for vset.cmd in $buildSourcesDirectory"
        $searchPattern = Join-Path -Path $buildSourcesDirectory -ChildPath '**\vset.cmd'
        $foundFiles = Find-Files -SearchPattern $searchPattern
        foreach($file in $foundFiles)
        {
            $vsetPath = $file;
            $vset = Get-Command -Name $vsetPath
            break;
        }
    }
}

if ($rootFolder)
{
    $arguments = "--root $rootFolder $arguments"
}


if ($patternManifest)
{
    $arguments = "--manifest-glob $patternManifest $arguments"
}

if ($outputPath)
{
    $arguments = "--output-path $outputPath $arguments"
}

if($cwd)
{
    Write-Verbose "Setting working directory to $cwd"
    Set-Location $cwd
}
else
{
    $location = Get-Location
    $cwd = $location.Path
}

$arguments = "package $arguments"

Write-Verbose "Running vset $vset"
Invoke-Tool -Path $vset.Path -Arguments $arguments -WorkingFolder $cwd

