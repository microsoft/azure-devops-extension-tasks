import * as tl from "azure-pipelines-task-lib";
import tr = require("azure-pipelines-task-lib/toolrunner");
import * as path from "path";

let cacheVsixPublisherExe = "";
let loggedIn = false;

export function getVsixPublisherExe(): string {
    if (cacheVsixPublisherExe === "") {
        const vswhereTool = tl.tool(path.join(__dirname, "tools", "vswhere.exe"));
        vswhereTool.line("-version [15.0,17.0) -latest -requires Microsoft.VisualStudio.Component.VSSDK -find VSSDK\\VisualStudioIntegration\\Tools\\Bin\\VsixPublisher.exe");
        const vswhereResult = vswhereTool.execSync({ silent: true } as tr.IExecSyncOptions);
        const vsixPublisherExe = vswhereResult.stdout.trim();
        if (vswhereResult.code === 0 && vsixPublisherExe && tl.exist(vsixPublisherExe))
        {
            tl.debug('VsixPublisher.exe installed path: ' + vsixPublisherExe);
            cacheVsixPublisherExe = vsixPublisherExe;
        }
        else
        {
            throw new Error("Could not locate vsixpublisher.exe. Ensure the Visual Studio SDK is installed on the agent.");
        }
    }
    return cacheVsixPublisherExe;
 }

export function login(publisher: string, token: string) {
    const vsixPublisherExe = getVsixPublisherExe();
    const vsixPublisher = tl.tool(vsixPublisherExe);

    vsixPublisher.arg("login");
    vsixPublisher.arg(["-personalAccessToken", token]);
    vsixPublisher.arg(["-publisherName", publisher]);

    if (vsixPublisher.execSync({ failOnStdErr: true } as tr.IExecOptions).code !== 0)
    {
        throw new Error("Login failed.");
    }

    loggedIn = true;
    console.info(`Login successful.`)
}

export function logout(publisher: string) {
    if (loggedIn)
    {
        const vsixPublisherExe = getVsixPublisherExe();
        const vsixPublisher = tl.tool(vsixPublisherExe);

        vsixPublisher.arg("logout");
        vsixPublisher.arg(["-publisherName", publisher]);
        vsixPublisher.arg("-ignoreMissingPublisher");

        if (vsixPublisher.execSync({ failOnStdErr: true } as tr.IExecOptions).code !== 0)
        {
            throw new Error("Logout failed.");
        }
        loggedIn = false;
    }
    console.info(`Logout successful.`)
}

export function publish(vsixPath: string, manifestPath: string, warningsToIgnore: string) {
    const vsixPublisherExe = getVsixPublisherExe();
    const vsixPublisher = tl.tool(vsixPublisherExe);

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