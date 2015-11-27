param (
    [string]$connectedServiceName,
    [string]$publisher,
    [string]$fileType,
    [string]$vsixFile,
    [string]$rootFolder,
    [string]$patternManifest,
    [string]$arguments,
    [string]$cwd    
)

function GetEndpointData
{
	param([string][ValidateNotNullOrEmpty()]$connectedServiceName)

	$serviceEndpoint = Get-ServiceEndpoint -Context $distributedTaskContext -Name $connectedServiceName

	if (!$serviceEndpoint)
	{
		throw "A Connected Service with name '$ConnectedServiceName' could not be found.  Ensure that this Connected Service was successfully provisioned using the services tab in the Admin UI."
	}

    return $serviceEndpoint
}

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

$serviceEndpoint = GetEndpointData $connectedServiceName
$galleryUrl = $($serviceEndpoint.Url)
$patToken = $($serviceEndpoint.Authorization.Parameters.Password)

if ($fileType = "manifest")
{
    if ($rootFolder)
    {
        $arguments = "--root $rootFolder $arguments"
    }
    
    if ($patternManifest)
    {
        $arguments = "--manifest-globs $patternManifest $arguments"
    }
}
else 
{
    $arguments = "--vsix $vsixFile"
}


if ($publisher) 
{
    $arguments = "--publisher $publisher $arguments"
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

$arguments = "extension publish --token $patToken --service-url $galleryUrl $arguments"

Write-Verbose "Running tfx $tfx"
Invoke-Tool -Path $tfx.Path -Arguments $arguments -WorkingFolder $cwd

