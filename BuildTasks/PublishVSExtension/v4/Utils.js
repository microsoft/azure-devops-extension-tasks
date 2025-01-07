"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVsixPublisherExe = getVsixPublisherExe;
exports.login = login;
exports.logout = logout;
exports.publish = publish;
const tl = require("azure-pipelines-task-lib");
const path = require("path");
let cacheVsixPublisherExe = "";
let loggedIn = false;
function getVsixPublisherExe() {
    if (cacheVsixPublisherExe === "") {
        const vswhereTool = tl.tool(path.join(__dirname, "tools", "vswhere.exe"));
        vswhereTool.line("-version [15.0,) -latest -requires Microsoft.VisualStudio.Component.VSSDK -find VSSDK\\VisualStudioIntegration\\Tools\\Bin\\VsixPublisher.exe");
        const vswhereResult = vswhereTool.execSync({ silent: true });
        const vsixPublisherExe = vswhereResult.stdout.trim();
        if (vswhereResult.code === 0 && vsixPublisherExe && tl.exist(vsixPublisherExe)) {
            tl.debug('VsixPublisher.exe installed path: ' + vsixPublisherExe);
            cacheVsixPublisherExe = vsixPublisherExe;
        }
        else {
            throw new Error("Could not locate vsixpublisher.exe. Ensure the Visual Studio SDK is installed on the agent.");
        }
    }
    return cacheVsixPublisherExe;
}
function login(publisher, token) {
    const vsixPublisherExe = getVsixPublisherExe();
    const vsixPublisher = tl.tool(vsixPublisherExe);
    vsixPublisher.arg("login");
    vsixPublisher.arg(["-personalAccessToken", token]);
    vsixPublisher.arg(["-publisherName", publisher]);
    if (vsixPublisher.execSync({ failOnStdErr: true }).code !== 0) {
        throw new Error("Login failed.");
    }
    loggedIn = true;
    console.info(`Login successful.`);
}
function logout(publisher) {
    if (loggedIn) {
        const vsixPublisherExe = getVsixPublisherExe();
        const vsixPublisher = tl.tool(vsixPublisherExe);
        vsixPublisher.arg("logout");
        vsixPublisher.arg(["-publisherName", publisher]);
        vsixPublisher.arg("-ignoreMissingPublisher");
        if (vsixPublisher.execSync({ failOnStdErr: true }).code !== 0) {
            throw new Error("Logout failed.");
        }
        loggedIn = false;
    }
    console.info(`Logout successful.`);
}
function publish(vsixPath, manifestPath, warningsToIgnore) {
    const vsixPublisherExe = getVsixPublisherExe();
    const vsixPublisher = tl.tool(vsixPublisherExe);
    vsixPublisher.arg("publish");
    vsixPublisher.arg(["-payload", vsixPath]);
    vsixPublisher.arg(["-publishManifest", manifestPath]);
    vsixPublisher.arg(["-ignoreWarnings", warningsToIgnore]);
    if (vsixPublisher.execSync({ failOnStdErr: true }).code !== 0) {
        throw new Error("Publish failed.");
    }
    console.info(`Published successfully.`);
}
//# sourceMappingURL=Utils.js.map