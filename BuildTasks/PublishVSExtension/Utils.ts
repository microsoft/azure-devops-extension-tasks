import * as tl from "azure-pipelines-task-lib";
import tr = require("azure-pipelines-task-lib/toolrunner");
import * as path from "path";

let cacheVsixPublisherExe = "";

export function getVsixPublisherExe(): string {
    if (cacheVsixPublisherExe == "") {
        const vswhereTool = tl.tool(path.join(__dirname, "tools", "vswhere.exe"));
        vswhereTool.line("-version [15.0,16.0) -latest -requires Microsoft.VisualStudio.Component.VSSDK -property installationPath");
        let vsPath = vswhereTool.execSync({ silent: true } as tr.IExecSyncOptions).stdout;
        vsPath = vsPath.trim();
        tl.debug('Visual Studio 15.0 or higher installed path: ' + vsPath);
        if (!isNullOrWhitespace(vsPath)) {
            let vsixPublisherFolder = path.join(vsPath, 'VSSDK', 'VisualStudioIntegration', 'Tools', 'Bin');
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

            cacheVsixPublisherExe = vsixPublisherExe;
            return vsixPublisherExe;
        }
    }
    else {
        return cacheVsixPublisherExe;
    }
    return null;
}

export function isNullOrWhitespace(input) {
    if (typeof input === 'undefined' || input === null) {
        return true;
    }
    return input.replace(/\s/g, '').length < 1;
}

export function login(publisher: string, token: string) {
    let vsixPublisherExe = getVsixPublisherExe();
    let vsixPublisher = tl.tool(vsixPublisherExe);

    vsixPublisher.arg("login");
    vsixPublisher.arg(["-personalAccessToken", token]);
    vsixPublisher.arg(["-publisherName", publisher]);

    if (vsixPublisher.execSync({ failOnStdErr: true } as tr.IExecOptions).code !== 0)
    {
        throw new Error("Login failed.");
    }

    console.info(`Login successful.`)
}
export function logout(publisher: string) {
    let vsixPublisherExe = getVsixPublisherExe();
    let vsixPublisher = tl.tool(vsixPublisherExe);

    vsixPublisher.arg("logout");
    vsixPublisher.arg(["-publisherName", publisher]);
    vsixPublisher.arg("-ignoreMissingPublisher");

    if (vsixPublisher.execSync({ failOnStdErr: true } as tr.IExecOptions).code !== 0)
    {
        throw new Error("Logout failed.");
    }
    
    console.info(`Logout successful.`)
}

export function publish(vsixPath: string, manifestPath: string, warningsToIgnore: string) {
    let vsixPublisherExe = getVsixPublisherExe();
    let vsixPublisher = tl.tool(vsixPublisherExe);

    vsixPublisher.arg("publish");
    vsixPublisher.arg(["-payload", vsixPath]);
    vsixPublisher.arg(["-publishManifest", manifestPath]);
    vsixPublisher.arg(["-ignoreWarnings", warningsToIgnore]);

    if (vsixPublisher.execSync({ failOnStdErr: true } as tr.IExecOptions).code !== 0)
    {
        throw new Error("Publish failed.");
    }

    console.info(`Published successfully.`)
}