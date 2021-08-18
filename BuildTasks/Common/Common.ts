import * as os from "os";
import * as path from "path";
import * as stream from "stream";
import * as fs from "fs";
import * as tl from "azure-pipelines-task-lib/task";
import * as trl from "azure-pipelines-task-lib/toolrunner";
import * as fse from "fs-extra";

import ToolRunner = trl.ToolRunner;
import * as uuidv5 from "uuidv5";

function writeBuildTempFile(taskName: string, data: any): string {
    let tempFile: string;
    do {
        // Let's add a random suffix
        const randomSuffix = Math.random().toFixed(6);
        tempFile = path.join(os.tmpdir(), `${taskName}-${randomSuffix}.tmp`);
    } while (tl.exist(tempFile));

    tl.debug(`Generating Build temp file: ${tempFile}`);
    tl.writeFile(tempFile, data);

    return tempFile;
}

function deleteBuildTempFile(tempFile: string) {
    if (tempFile && tl.exist(tempFile)) {
        tl.debug(`Deleting temp file: ${tempFile}`);
        fs.unlinkSync(tempFile);
    }
}

/**
 * Set manifest related arguments for "tfx extension" command, such as
 * the  --root or the --manifest-globs switches.
 * @param  {ToolRunner} tfx
 * @returns {() => void} Cleaner function that the caller should use to cleanup temporary files created to be used as arguments
 */
export function validateAndSetTfxManifestArguments(tfx: ToolRunner): (() => void) {
    const rootFolder = tl.getInput("rootFolder", false);
    tfx.argIf(rootFolder, ["--root", rootFolder]);

    
    const globsManifest = tl.getDelimitedInput("patternManifest", "\n", false);
    tfx.argIf(globsManifest.length, ["--manifest-globs"]);
    tfx.argIf(globsManifest.length, globsManifest);

    // Overrides manifest file
    const publisher = tl.getInput("publisherId", false);

    const localizationRoot = tl.getInput("localizationRoot", false);
    tfx.argIf(localizationRoot, ["--loc-root", localizationRoot]);

    let extensionId = tl.getInput("extensionId", false);
    const extensionTag = tl.getInput("extensionTag", false);

    if (extensionId && extensionTag) {
        extensionId += extensionTag;
        tl.debug(`Overriding extension id to: ${extensionId}`);
    }

    // for backwards compat check both "method" and "fileType"
    switch (tl.getInput("method", false) || tl.getInput("fileType", false)) {
        // for backwards compat trigger on both "manifest" and "id"
        case "manifest":
        case "id":
        default: {
            tfx.argIf(publisher, ["--publisher", publisher]);
            tfx.argIf(extensionId, ["--extension-id", extensionId]);
            break;
        }
        case "vsix": {
            const vsixFilePattern = tl.getPathInput("vsixFile", true);
            let matchingVsixFile: string[];
            if (vsixFilePattern.indexOf("*") >= 0 || vsixFilePattern.indexOf("?") >= 0) {
                tl.debug("Pattern found in vsixFile parameter.");
                matchingVsixFile = tl.findMatch(process.cwd(), vsixFilePattern);
            }
            else {
                tl.debug("No pattern found in vsixFile parameter.");
                matchingVsixFile = [vsixFilePattern];
            }

            if (!matchingVsixFile || matchingVsixFile.length === 0) {
                tl.setResult(tl.TaskResult.Failed, `Found no vsix files matching: ${vsixFilePattern}.`);
                throw "failed";
            }
            if (matchingVsixFile.length !== 1) {
                tl.setResult(tl.TaskResult.Failed, `Found multiple vsix files matching: ${vsixFilePattern}.`);
                throw "failed";
            }
            tfx.arg(["--vsix", matchingVsixFile[0]]);
            break;
        }
    }

    let jsonOverrides: any;
    const extensionName = tl.getInput("extensionName", false);
    if (extensionName) {
        tl.debug(`Overriding extension name to: ${extensionName}`);
        jsonOverrides = (jsonOverrides || {});
        jsonOverrides.name = extensionName;
    }

    const extensionVisibility = tl.getInput("extensionVisibility", false);
    if (extensionVisibility && extensionVisibility !== "default") {
        tl.debug(`Overriding extension visibility to: ${extensionVisibility}`);
        jsonOverrides = (jsonOverrides || {});

        const isPublic = extensionVisibility.indexOf("public") >= 0;
        const isPreview = extensionVisibility.indexOf("preview") >= 0;

        jsonOverrides.public = isPublic;

        if (isPreview) {
            jsonOverrides.galleryFlags = jsonOverrides.galleryFlags || [];
            jsonOverrides.galleryFlags.push("Preview");
        }
    }

    const extensionPricing = tl.getInput("extensionPricing", false);
    if (extensionPricing && extensionPricing !== "default") {
        tl.debug(`Overriding extension pricing to: ${extensionPricing}`);
        jsonOverrides = (jsonOverrides || {});

        const isPaid = extensionPricing.indexOf("paid") >= 0;

        if (isPaid) {
            jsonOverrides.galleryFlags = jsonOverrides.galleryFlags || [];
            jsonOverrides.galleryFlags.push("Paid");
        }
    }

    const extensionVersion = getExtensionVersion();
    if (extensionVersion) {
        tl.debug(`Overriding extension version to: ${extensionVersion}`);
        jsonOverrides = (jsonOverrides || {});
        jsonOverrides.version = extensionVersion;
    }

    const noWaitValidation = tl.getBoolInput("noWaitValidation", false);
    if (noWaitValidation) {
        tl.debug(`Not waiting for validation.`);
        tfx.arg("--no-wait-validation");
    }

    const bypassLocalValidation = tl.getBoolInput("bypassLocalValidation", false);
    if (bypassLocalValidation) {
        tl.debug(`Bypassing local validation.`);
        tfx.arg("--bypass-validation");
    }

    let overrideFilePath: string;
    if (jsonOverrides) {
        // Generate a temp file
        overrideFilePath = writeBuildTempFile("PackageTask", JSON.stringify(jsonOverrides));
        tl.debug(`Generated a JSON temp file to override manifest values Path: ${overrideFilePath}`);

        tfx.arg(["--overrides-file", overrideFilePath]);
    }

    const args = tl.getInput("arguments", false);
    if (args) {
        tl.debug(`Adding additional arguments: ${args}.`);
        tfx.line(args);
    }

    return () => deleteBuildTempFile(overrideFilePath);
}

/**
 * Run a tfx command by ensuring that "tfx" exists, installing it on the fly if needed.
 * @param  {(tfx:ToolRunner)=>void} cmd
 */
export async function runTfx(cmd: (tfx: ToolRunner) => void) : Promise<boolean> {
    let tfx: ToolRunner;
    let tfxPath: string;

    const tryRunCmd = async (tfx: ToolRunner) => {
        try {
            // Set working folder
            const cwd = tl.getInput("cwd", false);
            if (cwd) {
                tl.cd(cwd);
            }

            cmd(tfx);
            return true;
        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, `Error running task: ${err}`);
            return false;
        }
    };

    const tfxInstallerPath = tl.getVariable("__tfxpath");
    if (tfxInstallerPath)
    {
        tfxPath = tl.which(path.join(tfxInstallerPath, "/tfx"));
    }

    if (tfxPath) {
        tl.debug(`using: ${tfxPath}`);
        tfx = new trl.ToolRunner(tfxPath);
        await tryRunCmd(tfx);
        return;
    }

    tl.setResult(tl.TaskResult.Failed, "Could not find tfx. To resolve, add the 'Use Node CLI for Azure DevOps' task to your pipeline before this task.");
}

/**
 * Reads the extension version from the 'extensionVersion' variable, extracting
 * just the part that is compatible with the versioning scheme used in the Marketplace.
 *
 * @returns string
 */
export function getExtensionVersion(): string {
    const extensionVersion = tl.getInput("extensionVersion", false);
    if (extensionVersion) {
        const extractedVersions = extensionVersion.match(/[0-9]+\.[0-9]+\.[0-9]+(?:\.[0-9]+)?/);
        if (extractedVersions && extractedVersions.length === 1) {
            return extractedVersions[0];
        }
        else {
            throw new Error(`Supplied ExtensionVersion must contain a string matching '##.##.##(.##)'.`);
        }
    }
    return "";
}

/**
 * Get the Marketplace endpoint details to be used while publishing or installing an extension.
 *
 * @param  {string="connectedServiceName"} inputFieldName
 * @returns string
 */
export function getMarketplaceEndpointDetails(inputFieldName: string): any {
    const marketplaceEndpoint = tl.getInput(inputFieldName, true);

    const hostUrl = tl.getEndpointUrl(marketplaceEndpoint, false);
    const auth = tl.getEndpointAuthorization(marketplaceEndpoint, false);
    const password = auth.parameters["password"];
    const username = auth.parameters["username"];
    const apitoken = auth.parameters["apitoken"];

    return {
        "url": hostUrl,
        "username": username,
        "password": password,
        "apitoken": apitoken
    };
}

/**
 * Sets the marketplace  endpoint details (url, credentials) for the toolrunner.
 *
 * @param  {ToolRunner} tfx
 * @returns string
 */
export function setTfxMarketplaceArguments(tfx: ToolRunner, setServiceUrl = true) : void {
    const connectTo = tl.getInput("connectTo", false) || "VsTeam";
    let galleryEndpoint;

    if (connectTo === "VsTeam") {
        galleryEndpoint = getMarketplaceEndpointDetails("connectedServiceName");
        tfx.argIf(setServiceUrl, ["--service-url", galleryEndpoint.url]);
        tfx.arg(["--auth-type", "pat"]);
        tfx.arg(["--token", galleryEndpoint.password]);
    } else {
        galleryEndpoint = getMarketplaceEndpointDetails("connectedServiceNameTFS");
        tfx.argIf(setServiceUrl, ["--service-url", galleryEndpoint.url]);

        if (galleryEndpoint.username) {
            tfx.arg(["--auth-type", "basic"]);
            tfx.arg(["--username", galleryEndpoint.username]);
            tfx.arg(["--password", galleryEndpoint.password]);
        }
        else {
            tfx.arg(["--auth-type", "pat"]);
            tfx.arg(["--token", galleryEndpoint.apitoken]);
        }
    }
}

/**
 * A writable stream intended to be used with Tfx when using JSON output.
 * This class overcomes the problem of having tfx warnings being displayed
 * in stdout as regular messages, even when using --json switch in tfx.
 *
 */
export class TfxJsonOutputStream extends stream.Writable {

    jsonString = "";
    messages: string[] = [];

    constructor(public out: (message: string) => void) {
        super();
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    _write(chunk: any, enc: string, cb: (Function)) : void {
        const chunkStr: string = chunk.toString();
        if (chunkStr.startsWith("[command]"))
        {
            this.taskOutput(chunkStr, this.out);
        }
        else if (!this.jsonString && (chunkStr.toString()[0] !== "{" && chunkStr.toString()[0] !== "[")) {
            this.messages.push(chunkStr);
            this.taskOutput(chunkStr, this.out);
        }
        else {
            this.jsonString += chunkStr;
            this.taskOutput(chunkStr, tl.debug);
        }

        cb();
    }

    private taskOutput(messages: string, lineWriter: (m: string) => void) {
        if (!messages) { return; }
        // Split messages to be sure that we are invoking the write lineWriter for each lineWriter
        // Otherwise we could get messages in console with the wrong prefix used by azure-pipelines-task-lib
        messages.split("\n").forEach(lineWriter);
    }
}

function getTaskPathContributions(manifest: any): string[] {
        // Check for task contributions
    if (!manifest.contributions) {
        return [];
    }

    return manifest.contributions
        .filter((c: any) => c.type === "ms.vss-distributed-task.task" && c.properties && c.properties["name"])
        .map((c: any) => c.properties["name"]);
}

function updateTaskId(manifest: any, publisherId: string, extensionId: string): unknown {
    tl.debug(`Task manifest ${manifest.name} id before: ${manifest.id}`);

    const extensionNs = uuidv5("url", "https://marketplace.visualstudio.com/vsts", true);
    manifest.id = uuidv5(extensionNs, `${publisherId}.${extensionId}.${manifest.name}`, false);

    tl.debug(`Task manifest ${manifest.name} id after: ${manifest.id}`);
    return manifest;
}

function updateExtensionManifestTaskIds(manifest: any, originalTaskId: string, newTaskId: string): unknown {
    if (!manifest.contributions) {
        tl.debug(`No contributions found`);
        return manifest;
    }
    
    manifest.contributions
        .filter((c: any) => c.type !== "ms.vss-distributed-task.task" && c.properties && c.properties.supportsTasks)
        .forEach((c: any) => {
            const supportsTasks = [...c.properties.supportsTasks];
            const index = supportsTasks.indexOf(originalTaskId);
            if(index != -1) {
                
                tl.debug(`Extension manifest supportsTasks before: ${c.properties.supportsTasks}`);

                supportsTasks[index] = newTaskId;
                c.properties.supportsTasks = supportsTasks;
                
                tl.debug(`Extension manifest supportsTasks after: ${c.properties.supportsTasks}`);
            } else{
                tl.debug(`No supportTasks entry found in manifest contribution`);
            }
        });

    return manifest;
}

function updateTaskVersion(manifest: any, extensionVersionString: string, extensionVersionType: string): unknown {
    const versionParts = extensionVersionString.split(".");
    if (versionParts.length > 3) {
        tl.warning("Detected a version that consists of more than 3 parts. Build tasks support only 3 parts, ignoring the rest.");
    }

    const extensionversion = { major: +versionParts[0], minor: +versionParts[1], patch: +versionParts[2] };

    if (!manifest.version && extensionVersionType !== "major") {
        tl.warning("Detected no version in task manifest. Forcing major.");
        manifest.version = extensionversion;
    } else {
        tl.debug(`Task manifest ${manifest.name} version before: ${JSON.stringify(manifest.version)}`);

        switch (extensionVersionType) {
            default:
            case "major": manifest.version.Major = `${extensionversion.major}`;
            // eslint-disable-next-line no-fallthrough
            case "minor": manifest.version.Minor = `${extensionversion.minor}`;
            // eslint-disable-next-line no-fallthrough
            case "patch": manifest.version.Patch = `${extensionversion.patch}`;
        }
    }
    tl.debug(`Task manifest ${manifest.name} version after: ${JSON.stringify(manifest.version)}`);
    return manifest;
}

/**
 *
 * Check whether the version update should be propagated to tasks included
 * in the extension.
 *
 */
export async function updateManifests(manifestPaths: string[]): Promise<void> {
    const updateTasksVersion = tl.getBoolInput("updateTasksVersion", false);
    const updateTasksId = tl.getBoolInput("updateTasksId", false);

    if (updateTasksVersion || updateTasksId) {
        if (!(manifestPaths && manifestPaths.length)) {
            manifestPaths = getExtensionManifestPaths();
        }

        tl.debug(`Found manifests: ${manifestPaths.join(", ")}`);

        const tasksIds = await updateTaskManifests(manifestPaths, updateTasksId, updateTasksVersion);
        await updateExtensionManifests(manifestPaths, tasksIds);
    }
}

async function updateTaskManifests(manifestPaths: string[], updateTasksId: boolean, updateTasksVersion: boolean) : Promise<[string, string][]> {
    const tasksIds: [string, string][] = [];

    await Promise.all(manifestPaths.map(async (extensionPath) => {
        const manifest: any = await getManifest(extensionPath);
        const taskManifestPaths: string[] = getTaskManifestPaths(extensionPath, manifest);

        if (taskManifestPaths && taskManifestPaths.length) {
            await Promise.all(taskManifestPaths.map(async (taskPath) => {
                tl.debug(`Patching: ${taskPath}.`);
                let taskManifest: any = await getManifest(taskPath);

                if (updateTasksId) {
                    tl.debug(`Updating Id...`);
                    const publisherId = tl.getInput("publisherId", false) || manifest.publisher;
                    const extensionTag = tl.getInput("extensionTag", false) || "";
                    const extensionId = `${(tl.getInput("extensionId", false) || manifest.id)}${extensionTag}`;

                    const originalTaskId: string = taskManifest.id || null;
                    taskManifest = updateTaskId(taskManifest, publisherId, extensionId);
                    const newTaskId: string = taskManifest.id;

                    if(originalTaskId && (originalTaskId !== newTaskId)) {
                        tasksIds.push([originalTaskId, newTaskId])
                    }
                }

                if (updateTasksVersion) {
                    tl.debug(`Updating version...`);
                    const extensionVersion = tl.getInput("extensionVersion", false) || manifest.version;
                    if (!extensionVersion) {
                        throw new Error(
                            "Extension Version was not supplied nor does the extension manifest define one.");
                    }
                    const extensionVersionType = tl.getInput("updateTasksVersionType", false) || "major";

                    taskManifest = updateTaskVersion(taskManifest, extensionVersion, extensionVersionType);
                }

                await writeManifest(taskManifest, taskPath);
                tl.debug(`Updated: ${taskPath}.`);
            }));
        }
    }));

    return tasksIds;
}

async function updateExtensionManifests(manifestPaths: string[], updatedTaskIds: [string, string][]): Promise<void> {
    await Promise.all(manifestPaths.map(async (path) => { 
        tl.debug(`Patching: ${path}.`);
        let originalManifest = await getManifest(path);

        updatedTaskIds.map(([originalTaskId, newTaskId]) => {
            tl.debug(`Updating: ${originalTaskId} => ${newTaskId}.`)
            originalManifest = updateExtensionManifestTaskIds(originalManifest, originalTaskId, newTaskId);
        });

        await writeManifest(originalManifest, path);
    }));
}

function getExtensionManifestPaths(): string[] {
    // Search for extension manifests given the rootFolder and patternManifest inputs
    const rootFolder = tl.getInput("rootFolder", false) || tl.getInput("System.DefaultWorkingDirectory");
    const manifestsPatterns = tl.getDelimitedInput("patternManifest", "\n", false) || ["vss-extension.json"];

    tl.debug(`Searching for extension manifests: ${manifestsPatterns.join(", ")}`);

    return tl.findMatch(rootFolder, manifestsPatterns);
}

function getManifest(path: string): Promise<unknown> {
    return fse.readFile(path, "utf8").then((data: string) => {
        try {
            data = data.replace(/^\uFEFF/,
                () => {
                    tl.warning(`Removing Unicode BOM from manifest file: ${path}.`);
                    return "";
                });
            return JSON.parse(data);
        } catch (jsonError) {
            throw new Error(`Error parsing task manifest: ${path} - ${jsonError}`);
        }
    });
}

function getTaskManifestPaths(manifestPath: string, manifest: any): string[] {
    const tasks = getTaskPathContributions(manifest);
    const rootFolder = path.dirname(manifestPath);

    return tasks.reduce((result: string[], task: string) => {
        tl.debug(`Found task: ${task}`);
        const taskRoot: string = path.join(rootFolder, task);
        const rootManifest: string = path.join(taskRoot, "task.json");
        
        let localizationRoot = tl.filePathSupplied("localizationRoot") ? tl.getPathInput("localizationRoot", false) : taskRoot;
        if (localizationRoot) {
            localizationRoot = path.resolve(localizationRoot);
        }

        if (tl.exist(rootManifest)) {
            tl.debug(`Found single-task manifest: ${rootManifest}`);
            const rootManifests: string[] = [rootManifest];
            const rootLocManifest: string = path.join(localizationRoot, "task.loc.json");
            if (tl.exist(rootLocManifest)) {
                tl.debug(`Found localized single-task manifest: ${rootLocManifest}`);
                rootManifests.push(rootLocManifest);
            }
            return (result).concat(rootManifests);
        } else {
            const versionManifests = tl.findMatch(taskRoot, "*/task.json");
            const locVersionManifests = tl.findMatch(localizationRoot, "*/task.loc.json");
            tl.debug(`Found multi-task manifests: ${versionManifests.join(", ")}`);
            tl.debug(`Found multi-task localized manifests: ${locVersionManifests.join(", ")}`);
            return (result).concat(versionManifests).concat(locVersionManifests);
        }
    }, []);
}

export function writeManifest(manifest: any, path: string): Promise<void> {
    return fse.writeJSON(path, manifest);
}

export function checkUpdateTasksManifests(manifestFile?: string): Promise<void> {
    return updateManifests(manifestFile ? [manifestFile] : []);
}
