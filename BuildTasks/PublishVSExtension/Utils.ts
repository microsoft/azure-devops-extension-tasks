import * as tl from "azure-pipelines-task-lib";
import tr = require("azure-pipelines-task-lib/toolrunner");
import * as path from "path";

export function getVsixPublisherFolderPath(): string {

    const vswhereTool = tl.tool(path.join(__dirname, "tools", "vswhere.exe"));
    vswhereTool.line("-version [15.0,16.0) -latest -requires Microsoft.VisualStudio.Component.VSSDK -property installationPath");
    let vsPath = vswhereTool.execSync({ silent: true } as tr.IExecSyncOptions).stdout;
    vsPath = trimString(vsPath);
    tl.debug('Visual Studio 15.0 or higher installed path: ' + vsPath);
    if (!isNullOrWhitespace(vsPath)) {
        return path.join(vsPath, 'VSSDK', 'VisualStudioIntegration', 'Tools', 'Bin');
    }
    return null;
}

export function trimString(input: string): string {
    if (input) {
        return input.replace(/^(?=\n)$|^\s*|\s*$|\n\n+/gm, '');
    }
    return input;
}
export function isNullOrWhitespace(input) {
    if (typeof input === 'undefined' || input === null) {
        return true;
    }
    return input.replace(/\s/g, '').length < 1;
}

export function getVsixPublisher(): string {

    let vsixPublisherFolder = getVsixPublisherFolderPath();
    if (!vsixPublisherFolder) {
        let message = "Unable to find instance of Visual Studio with VSSDK installed...";
        throw new Error(message);

    }

    tl.debug(`VSINSTALLDIR: '${vsixPublisherFolder}'`);

    let vsixPublisherExe = path.join(vsixPublisherFolder, "VsixPublisher.exe");
    let vsixPublisherExists = tl.which(vsixPublisherExe, true);
    if (!vsixPublisherExists) {
        let message = `Could not find VSIXPublisher.exe under '${vsixPublisherFolder}'`;
        throw new Error(message);
    }

    tl.debug(`VSIXPublisher.exe path: '${vsixPublisherExe}'`);

    return vsixPublisherExe;
}

export function login(publisher: string, token: string) {

    let vsixPublisherExe = getVsixPublisher();

    let vsixPublisher = tl.tool(vsixPublisherExe);
    vsixPublisher.line(`login -personalAccessToken ${token} -publisherName ${publisher}`);

    let loginOutput = vsixPublisher.execSync({ silent: true } as tr.IExecSyncOptions);

    if (loginOutput.stderr) {
        throw new Error(loginOutput.stderr);
    }
    console.info(`Login successful.`)
}
export function logout(publisher: string) {

    let vsixPublisherExe = getVsixPublisher();

    let vsixPublisher = tl.tool(vsixPublisherExe);
    vsixPublisher.line(`logout -publisherName ${publisher} -ignoreMissingPublisher`);
    let logoutOutput = vsixPublisher.execSync({ silent: true } as tr.IExecSyncOptions);

    if (logoutOutput.stderr) {
        throw new Error(logoutOutput.stderr);
    }
    console.info(`Logout successful.`)
}

export function publish(vsixPath: string, manifestPath: string, warningsToIgnore: string) {

    let vsixPublisherExe = getVsixPublisher();

    let vsixPublisher = tl.tool(vsixPublisherExe);
    vsixPublisher.line(`publish -payload ${vsixPath} -publishManifest ${manifestPath} -ignoreWarnings ${warningsToIgnore}`);
    let logoutOutput = vsixPublisher.execSync({ silent: true } as tr.IExecSyncOptions);

    if (logoutOutput.stderr) {
        throw new Error(logoutOutput.stderr);
    }
    console.info(`Published successfully.`)
}