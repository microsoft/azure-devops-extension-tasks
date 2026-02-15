"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionInstall = exports.AccountInstallReport = exports.getCommand = void 0;
const args = require("../../lib/arguments");
const colors = require("colors");
const extBase = require("./default");
const extInfo = require("./_lib/extensioninfo");
const trace = require("../../lib/trace");
const https = require("https");
const http = require("http");
const SPS_INSTANCE_TYPE = "951917AC-A960-4999-8464-E3F0AA25B381";
function getCommand(args) {
    return new ExtensionInstall(args);
}
exports.getCommand = getCommand;
class AccountInstallReport {
    constructor(itemId, accountName, accountId, installed = false, reason) {
        this.itemId = itemId;
        this.accountName = accountName;
        this.accountId = accountId;
        this.installed = installed;
        this.reason = reason;
    }
    setError(reason) {
        this.installed = false;
        this.reason = reason;
    }
    setInstalled(reason) {
        this.installed = true;
        this.reason = reason;
    }
}
exports.AccountInstallReport = AccountInstallReport;
class ExtensionInstall extends extBase.ExtensionBase {
    constructor(passedArgs) {
        super(passedArgs);
        this.description = "Install a Azure DevOps Extension to a list of Azure DevOps Organizations.";
        this.serverCommand = true;
    }
    setCommandArgs() {
        super.setCommandArgs();
        this.registerCommandArgument("accounts", "Installation target organizations", "List of organizations where to install the extension.", args.ArrayArgument, null, true);
        this.registerCommandArgument("serviceUrl", "Collection/Organization URL", "URL of the organization or collection to install extension to.", args.StringArgument, undefined);
    }
    getHelpArgs() {
        return ["publisher", "extensionId", "vsix", "accounts"];
    }
    async exec() {
        // Check that they're not trying to use a previous version of this command
        const accounts = await this.commandArgs.accounts.val(true);
        if (accounts) {
            throw new Error("Installing extensions to multiple organizations no longer supported. Please use the following syntax to install an extension to an account/collection:\ntfx extension install --service-url <account/collection url> --token <pat> --publisher <publisher> --extension-id <extension id>");
        }
        trace.debug("Installing extension by name");
        // Read extension info from arguments
        const result = { accounts: {}, extension: null };
        const extInfo = await this._getExtensionInfo();
        const itemId = `${extInfo.publisher}.${extInfo.id}`;
        result.extension = itemId;
        // New flow - service-url contains account. Install to 1 account at a time.
        const serviceUrl = await ExtensionInstall.getEmsAccountUrl(await this.commandArgs.serviceUrl.val());
        const emsApi = await this.webApi.getExtensionManagementApi(serviceUrl);
        trace.debug("Installing extension by name: " + extInfo.publisher + ": " + extInfo.id);
        try {
            const installation = await emsApi.installExtensionByName(extInfo.publisher, extInfo.id);
            const installationResult = { installed: true, issues: null };
            if (installation.installState.installationIssues && installation.installState.installationIssues.length > 0) {
                installationResult.installed = false;
                installationResult.issues = `The following issues were encountered installing to ${serviceUrl}: 
${installation.installState.installationIssues.map(i => " - " + i).join("\n")}`;
            }
            result.accounts[serviceUrl] = installationResult;
        }
        catch (err) {
            if (err.message.indexOf("TF400856") >= 0) {
                throw new Error("Failed to install extension (TF400856). Ensure service-url includes a collection name, e.g. " +
                    serviceUrl.replace(/\/$/, "") +
                    "/DefaultCollection");
            }
            else if (err.message.indexOf("TF1590010") >= 0) {
                trace.warn("The given extension is already installed, so nothing happened.");
            }
            else {
                throw err;
            }
        }
        return result;
    }
    getEmsAccountUrl(marketplaceUrl, accountName) {
        if (marketplaceUrl.toLocaleLowerCase().indexOf("marketplace.visualstudio.com") >= 0) {
            return `https://${accountName}.extmgmt.visualstudio.com`;
        }
        if (marketplaceUrl.toLocaleLowerCase().indexOf("me.tfsallin.net") >= 0) {
            return marketplaceUrl.toLocaleLowerCase().indexOf("https://") === 0
                ? `https://${accountName}.me.tfsallin.net:8781`
                : `http://${accountName}.me.tfsallin.net:8780`;
        }
        return marketplaceUrl;
    }
    friendlyOutput(data) {
        trace.success("\n=== Completed operation: install extension ===");
        Object.keys(data.accounts).forEach(a => {
            trace.info(`- ${a}: ${data.accounts[a].installed ? colors.green("success") : colors.red(data.accounts[a].issues)}`);
        });
    }
    async _getExtensionInfo() {
        const vsixPath = await this.commandArgs.vsix.val(true);
        let extInfoPromise;
        if (vsixPath !== null) {
            extInfoPromise = extInfo.getExtInfo(vsixPath[0], null, null);
        }
        else {
            extInfoPromise = Promise.all([this.commandArgs.publisher.val(), this.commandArgs.extensionId.val()]).then(values => {
                const [publisher, extension] = values;
                return extInfo.getExtInfo(null, extension, publisher);
            });
        }
        return extInfoPromise;
    }
    static async getEmsAccountUrl(tfsAccountUrl) {
        trace.debug("Get ems account url for " + tfsAccountUrl);
        const acctUrlNoSlash = tfsAccountUrl.endsWith("/") ? tfsAccountUrl.substr(0, tfsAccountUrl.length - 1) : tfsAccountUrl;
        if (acctUrlNoSlash.indexOf("visualstudio.com") < 0 && acctUrlNoSlash.indexOf("dev.azure.com") < 0) {
            return acctUrlNoSlash;
        }
        const url = `${acctUrlNoSlash}/_apis/resourceareas/6c2b0933-3600-42ae-bf8b-93d4f7e83594`;
        const httpModule = url.indexOf("https://") >= 0 ? https : http;
        const response = await new Promise((resolve, reject) => {
            httpModule
                .get(url, resp => {
                let data = "";
                resp.on("data", chunk => {
                    data += chunk;
                });
                resp.on("end", () => {
                    resolve(data);
                });
            })
                .on("error", err => {
                reject(err);
            });
        });
        trace.debug("response: " + response);
        const resourceArea = JSON.parse(response);
        return resourceArea.locationUrl;
    }
}
exports.ExtensionInstall = ExtensionInstall;
//# sourceMappingURL=install.js.map