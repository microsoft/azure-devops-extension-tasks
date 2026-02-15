"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSettingsFile = exports.DiskCache = void 0;
const fs = __importStar(require("fs"));
const promiseUtils_1 = require("./promiseUtils");
var osHomedir = require("os-homedir");
var path = require("path");
var shell = require("shelljs");
var trace = require("./trace");
class DiskCache {
    constructor(appName) {
        this.appName = appName;
    }
    getFilePath(store, name) {
        var storeFolder = path.join(osHomedir(), "." + this.appName, store);
        try {
            shell.mkdir("-p", storeFolder);
        }
        catch (e) { }
        return path.join(storeFolder, "." + name);
    }
    itemExists(store, name) {
        var deferred = (0, promiseUtils_1.defer)();
        fs.exists(this.getFilePath(store, name), (exists) => {
            deferred.resolve(exists);
        });
        return deferred.promise;
    }
    getItem(store, name) {
        trace.debug("cache.getItem");
        var deferred = (0, promiseUtils_1.defer)();
        var fp = this.getFilePath(store, name);
        trace.debugArea("read: " + store + ":" + name, "CACHE");
        trace.debugArea(fp, "CACHE");
        fs.readFile(fp, (err, contents) => {
            if (err) {
                deferred.reject(err);
                return;
            }
            var str = contents.toString();
            trace.debugArea(str, "CACHE");
            deferred.resolve(str);
        });
        return deferred.promise;
    }
    setItem(store, name, data) {
        trace.debug("cache.setItem");
        var deferred = (0, promiseUtils_1.defer)();
        var fp = this.getFilePath(store, name);
        trace.debugArea("write: " + store + ":" + name + ":" + data, "CACHE");
        trace.debugArea(fp, "CACHE");
        fs.writeFile(fp, data, { flag: "w" }, (err) => {
            if (err) {
                deferred.reject(err);
                return;
            }
            trace.debugArea("written", "CACHE");
            deferred.resolve(null);
        });
        return deferred.promise;
    }
    deleteItem(store, name) {
        return new Promise((resolve, reject) => {
            fs.unlink(this.getFilePath(store, name), err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(null);
                }
            });
        });
    }
}
exports.DiskCache = DiskCache;
function parseSettingsFile(settingsPath, noWarn) {
    trace.debug("diskcache.parseSettings");
    trace.debug("reading settings from %s", settingsPath);
    return new Promise((resolve, reject) => {
        try {
            if (fs.existsSync(settingsPath)) {
                let settingsStr = fs.readFileSync(settingsPath, "utf8").replace(/^\uFEFF/, "");
                let settingsJSON;
                try {
                    resolve(JSON.parse(settingsStr));
                }
                catch (err) {
                    trace.warn("Could not parse settings file as JSON. No settings were read from %s.", settingsPath);
                    resolve({});
                }
            }
            else {
                if (!noWarn) {
                    trace.warn("No settings file found at %s.", settingsPath);
                }
                resolve({});
            }
        }
        catch (err) {
            reject(err);
        }
    });
}
exports.parseSettingsFile = parseSettingsFile;
//# sourceMappingURL=diskcache.js.map