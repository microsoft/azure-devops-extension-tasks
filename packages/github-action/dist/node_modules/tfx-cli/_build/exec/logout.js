"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reset = exports.getCommand = void 0;
const tfcommand_1 = require("../lib/tfcommand");
const diskcache_1 = require("../lib/diskcache");
const credStore = require("../lib/credstore");
const trace = require("../lib/trace");
function getCommand(args) {
    return new Reset(args);
}
exports.getCommand = getCommand;
class Reset extends tfcommand_1.TfCommand {
    getHelpArgs() {
        return [];
    }
    constructor(args) {
        super(args);
        this.description = "Log out and clear cached credential.";
        this.serverCommand = false;
    }
    async exec() {
        return Promise.resolve(null);
    }
    dispose() {
        let diskCache = new diskcache_1.DiskCache("tfx");
        return diskCache.itemExists("cache", "connection").then(isCachedConnection => {
            if (isCachedConnection) {
                return diskCache
                    .getItem("cache", "connection")
                    .then(cachedConnection => {
                    let store = credStore.getCredentialStore("tfx");
                    return store.credentialExists(cachedConnection, "allusers").then(isCredential => {
                        if (isCredential) {
                            return store.clearCredential(cachedConnection, "allusers");
                        }
                        else {
                            return Promise.resolve(null);
                        }
                    });
                })
                    .then(() => {
                    return diskCache.deleteItem("cache", "connection");
                });
            }
            else {
                return Promise.resolve(null);
            }
        });
    }
    friendlyOutput() {
        trace.success("Successfully logged out.");
    }
}
exports.Reset = Reset;
//# sourceMappingURL=logout.js.map