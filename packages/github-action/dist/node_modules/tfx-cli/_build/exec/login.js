"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Login = exports.getCommand = void 0;
const tfcommand_1 = require("../lib/tfcommand");
const diskcache_1 = require("../lib/diskcache");
const credstore_1 = require("../lib/credstore");
const colors = require("colors");
const os = require("os");
const trace = require("../lib/trace");
function getCommand(args) {
    // this just offers description for help and to offer sub commands
    return new Login(args);
}
exports.getCommand = getCommand;
/**
 * Facilitates a "log in" to a service by caching credentials.
 */
class Login extends tfcommand_1.TfCommand {
    constructor() {
        super(...arguments);
        this.description = "Login and cache credentials using a PAT or basic auth.";
        this.serverCommand = true;
    }
    async exec() {
        trace.debug("Login.exec");
        return this.commandArgs.serviceUrl.val().then(async (collectionUrl) => {
            const skipCertValidation = await this.commandArgs.skipCertValidation.val(false);
            const authHandler = await this.getCredentials(collectionUrl, false);
            const webApi = await this.getWebApi({
                ignoreSslError: skipCertValidation
            });
            const locationsApi = await webApi.getLocationsApi();
            try {
                const connectionData = await locationsApi.getConnectionData();
                let tfxCredStore = (0, credstore_1.getCredentialStore)("tfx");
                let tfxCache = new diskcache_1.DiskCache("tfx");
                let credString;
                if (authHandler.username === "OAuth") {
                    credString = "pat:" + authHandler.password;
                }
                else {
                    credString = "basic:" + authHandler.username + ":" + authHandler.password;
                }
                await tfxCredStore.storeCredential(collectionUrl, "allusers", credString);
                await tfxCache.setItem("cache", "connection", collectionUrl);
                await tfxCache.setItem("cache", "skipCertValidation", skipCertValidation.toString());
                return { success: true };
            }
            catch (err) {
                if (err && err.statusCode && err.statusCode === 401) {
                    trace.debug("Connection failed: invalid credentials.");
                    throw new Error("Invalid credentials. " + err.message);
                }
                else if (err) {
                    trace.debug("Connection failed.");
                    throw new Error("Connection failed. Check your internet connection & collection URL." +
                        os.EOL +
                        "Message: " +
                        err.message);
                }
                else {
                    throw new Error("Unknown error logging in.");
                }
            }
        });
    }
    friendlyOutput(data) {
        if (data.success) {
            trace.info(colors.green("Logged in successfully"));
        }
        else {
            trace.error("login unsuccessful.");
        }
    }
}
exports.Login = Login;
//# sourceMappingURL=login.js.map