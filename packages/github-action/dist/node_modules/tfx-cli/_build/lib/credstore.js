"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCredentialStore = void 0;
var osHomedir = require("os-homedir");
var path = require("path");
var cm = require("./diskcache");
var cache = new cm.DiskCache("tfx");
function getCredentialStore(appName) {
    // TODO: switch on OS specific cred stores.
    var store = new FileStore();
    store.appName = appName;
    return store;
}
exports.getCredentialStore = getCredentialStore;
class FileStore {
    escapeService(service) {
        service = service.replace(/:/g, "");
        service = service.replace(/\//g, "_");
        return service;
    }
    credentialExists(service, user) {
        return cache.itemExists(this.escapeService(service), user);
    }
    getCredential(service, user) {
        return cache.getItem(this.escapeService(service), user);
    }
    storeCredential(service, user, password) {
        return cache.setItem(this.escapeService(service), user, password);
    }
    clearCredential(service, user) {
        return cache.deleteItem(this.escapeService(service), user);
    }
}
//# sourceMappingURL=credstore.js.map