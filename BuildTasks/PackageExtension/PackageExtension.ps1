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

# try to find tfx in the path
$tfx = Get-Command -Name tfx -ErrorAction Ignore

if(!$tfx)
{
    Write-Verbose "try to find tfx in the node_modules in the sources directory"
    $buildSourcesDirectory = Get-TaskVariable -Context $distributedTaskContext -Name "Build.SourcesDirectory"
    $nodeBinPath = Join-Path -Path $buildSourcesDirectory -ChildPath 'node_modules\.bin'

    if(Test-Path -Path $nodeBinPath -PathType Container)
    {
        $tfxPath = Join-Path -Path $nodeBinPath -ChildPath "tfx.cmd"
        Write-Verbose "Looking for tfx.cmd in $tfxPath"
        $tfx = Get-Command -Name $tfxPath -ErrorAction Ignore
    }
    else
    {
        Write-Verbose "Recursively searching for tfx.cmd in $buildSourcesDirectory"
        $searchPattern = Join-Path -Path $buildSourcesDirectory -ChildPath '**\tfx.cmd'
        $foundFiles = Find-Files -SearchPattern $searchPattern
        foreach($file in $foundFiles)
        {
            $tfxPath = $file;
            $tfx = Get-Command -Name $tfxPath
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
    $arguments = "--manifest-globs $patternManifest $arguments"
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

$arguments = "extension create $arguments"

Write-Verbose "Running tfx $tfx"
Invoke-Tool -Path $tfx.Path -Arguments $arguments -WorkingFolder $cwd

