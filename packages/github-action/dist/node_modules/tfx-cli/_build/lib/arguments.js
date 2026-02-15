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
exports.getOptionsCache = exports.SilentStringArgument = exports.StringArgument = exports.JsonArgument = exports.FloatArgument = exports.IntArgument = exports.BooleanArgument = exports.ExistingDirectoriesArgument = exports.ReadableFilePathsArgument = exports.WritableFilePathsArgument = exports.ExistingFilePathsArgument = exports.FilePathsArgument = exports.ArrayArgument = exports.Argument = void 0;
const _ = require("lodash");
const common = require("../lib/common");
const diskcache_1 = require("../lib/diskcache");
const path = require("path");
const qread = require("./qread");
const util_1 = require("util");
const fsUtils = __importStar(require("./fsUtils"));
const fs_1 = require("fs");
/**
 * Class that represents an argument with a value. Calling .val() will retrieve
 * the typed value, parsed from the givenValue (a string). If no givenValue
 * was provided, we will prompt the user.
 */
class Argument {
    constructor(name, friendlyName = name, description, givenValue, hasDefaultValue, aliases, undocumented = false, promptDefault) {
        this.name = name;
        this.friendlyName = friendlyName;
        this.description = description;
        this.hasDefaultValue = hasDefaultValue;
        this.aliases = aliases;
        this.undocumented = undocumented;
        this.promptDefault = promptDefault;
        this.silent = false;
        if (typeof givenValue === "string") {
            this.givenValue = [givenValue];
        }
        else {
            this.givenValue = givenValue;
        }
        this.initialize();
    }
    /**
     * If this argument was given a default value:
     *   check the cache
     *     if it's there, set assignedValue to the getValue(cachedValue)
     *     else set assigned value to given default
     * If this argument was given a default value of null
     *   set null as the assignedValue
     * If this argument was not given any value
     *   check the cache
     *     if it's there, set assignedValue to cachedValue
     *
     * Promise is resolved after any values that need parsing are parsed,
     * and there are no more calls to the cache.
     */
    initialize() {
        let initPromise = Promise.resolve(null);
        if (this.assignedValue === undefined && (this.hasDefaultValue || this.givenValue === undefined)) {
            initPromise = getOptionsCache().then(cache => {
                let cacheKey = path.resolve().replace("/.[]/g", "-") +
                    "." +
                    common.EXEC_PATH.slice(0, common.EXEC_PATH.length - 1).join("/");
                let cachedValue = _.get(cache, cacheKey + "." + this.name);
                let cachedValueStringArray;
                if (typeof cachedValue === "string") {
                    cachedValueStringArray = [cachedValue];
                }
                else if (_.isArray(cachedValue)) {
                    cachedValueStringArray = cachedValue;
                }
                if (cachedValue !== undefined) {
                    return this.getValue(cachedValueStringArray).then(result => {
                        this.initializeAssignedValue(result);
                    });
                }
                else if (this.givenValue !== null && this.givenValue !== undefined) {
                    return this.getValue(this.givenValue).then(result => {
                        this.initializeAssignedValue(result);
                    });
                }
                else if (this.givenValue === null) {
                    this.initializeAssignedValue(null);
                }
            });
        }
        else if (this.assignedValue === undefined) {
            if (this.givenValue === null) {
                this.initializeAssignedValue(null);
            }
            else if (this.givenValue !== undefined) {
                initPromise = this.getValue(this.givenValue).then(result => {
                    this.initializeAssignedValue(result);
                });
            }
        }
        this.initializePromise = initPromise;
        return initPromise;
    }
    initializeAssignedValue(val) {
        if (this.assignedValue === undefined) {
            this.assignedValue = val;
        }
    }
    /**
     * Override whatever exists and give this argument a value.
     */
    setValue(value) {
        this.assignedValue = value;
        this.initializePromise = Promise.resolve(null);
    }
    /**
     * Get the value of this argument by what was passed in. If nothing has
     * been passed in, prompt the user. The resulting promise is resolved
     * when a value is available.
     */
    val(noPrompt = false) {
        return this.initializePromise.then(() => {
            if (this.assignedValue !== undefined) {
                return Promise.resolve(this.assignedValue);
            }
            else {
                if (!noPrompt && !this.undocumented) {
                    if (common.NO_PROMPT) {
                        throw new Error("Missing required value for argument '" + this.name + "'.");
                    }
                    return qread.read(this.name, this.friendlyName, this.silent, this.promptDefault).then(answer => {
                        // Split answer into args, just as if they were passed through command line
                        let splitAnswer = answer.match(/".+?"|[^ ]+/g) || [""];
                        let answerArgs = splitAnswer.map(a => {
                            // trim quotes if needed
                            if (a.substr(0, 1) === '"' && a.substr(a.length - 1, 1) === '"') {
                                a = a.substr(1, a.length - 1);
                            }
                            return a;
                        });
                        return this.getValue(answerArgs).then(result => {
                            this.assignedValue = result;
                            this.hasDefaultValue = false;
                            return result;
                        });
                    });
                }
                else {
                    return Promise.resolve(null);
                }
            }
        });
    }
}
exports.Argument = Argument;
/**
 * Argument that represents an array of comma-separated strings.
 */
class ArrayArgument extends Argument {
    async getValue(argParams) {
        const params = Array.isArray(argParams) ? argParams : await argParams;
        if (params.length === 1) {
            let stripped = params[0].replace(/(^\[)|(\]$)/g, "");
            return Promise.resolve(stripped.split(",").map(s => s.trim()));
        }
        else {
            return Promise.resolve(params);
        }
    }
}
exports.ArrayArgument = ArrayArgument;
/**
 * Argument that represents a set of file paths.
 * @TODO: Better validation of valid/invalid file paths (FS call?)
 */
class FilePathsArgument extends Argument {
    async getValue(argParams) {
        const params = Array.isArray(argParams) ? argParams : await argParams;
        return Promise.resolve(params.map(p => path.resolve(p)));
    }
}
exports.FilePathsArgument = FilePathsArgument;
/**
 * Argument that represents a set of existing file paths
 */
class ExistingFilePathsArgument extends FilePathsArgument {
    async getValue(argParams) {
        return super.getValue(argParams).then(paths => {
            let existencePromises = [];
            paths.forEach(p => {
                let promise = fsUtils.exists(p).then(exists => {
                    if (!exists) {
                        throw new Error("The file at path " + p + " does not exist.");
                    }
                    else {
                        return p;
                    }
                });
                existencePromises.push(promise);
            });
            return Promise.all(existencePromises);
        });
    }
}
exports.ExistingFilePathsArgument = ExistingFilePathsArgument;
/**
 * Argument that represents a set of writable file paths.
 * Paths that refer to existing files are checked for writability
 * Paths that refer to non-existent files are assumed writable.
 */
class WritableFilePathsArgument extends FilePathsArgument {
    async getValue(argParams) {
        return super.getValue(argParams).then(paths => {
            let canWritePromises = [];
            paths.forEach(p => {
                let promise = fsUtils.canWriteTo(p).then(canWrite => {
                    if (canWrite) {
                        return p;
                    }
                    else {
                        throw new Error("The file at path " + p + " is not writable.");
                    }
                });
                canWritePromises.push(promise);
            });
            return Promise.all(canWritePromises);
        });
    }
}
exports.WritableFilePathsArgument = WritableFilePathsArgument;
/**
 * Argument that represents a set of readable file paths
 */
class ReadableFilePathsArgument extends ExistingFilePathsArgument {
    async getValue(argParams) {
        return super.getValue(argParams).then(paths => {
            let canReadPromises = [];
            paths.forEach(p => {
                let promise = fsUtils.fileAccess(p, fsUtils.R_OK).then(canRead => {
                    if (canRead) {
                        return p;
                    }
                    else {
                        throw new Error("The file at path " + p + " is not readable.");
                    }
                });
                canReadPromises.push(promise);
            });
            return Promise.all(canReadPromises);
        });
    }
}
exports.ReadableFilePathsArgument = ReadableFilePathsArgument;
/**
 * Argument that represents a set of existing directory file paths
 */
class ExistingDirectoriesArgument extends ExistingFilePathsArgument {
    async getValue(argParams) {
        return super.getValue(argParams).then(paths => {
            let isDirectoryPromises = [];
            paths.forEach(p => {
                let promise = (0, util_1.promisify)(fs_1.lstat)(p).then(stats => {
                    if (stats.isDirectory()) {
                        return p;
                    }
                    else {
                        throw new Error("The path " + p + " is not a directory.");
                    }
                });
                isDirectoryPromises.push(promise);
            });
            return Promise.all(isDirectoryPromises);
        });
    }
}
exports.ExistingDirectoriesArgument = ExistingDirectoriesArgument;
/**
 * Argument that represents a boolean value.
 */
class BooleanArgument extends Argument {
    /**
     * If a value is given, parse it and cache the value.
     */
    initialize() {
        this.initializePromise = Promise.resolve(null);
        if (this.givenValue !== undefined) {
            if (this.givenValue === null) {
                this.assignedValue = false;
                this.initializePromise = Promise.resolve(null);
            }
            else {
                this.initializePromise = this.getValue(this.givenValue).then(result => {
                    this.assignedValue = result;
                });
            }
        }
        return this.initializePromise;
    }
    /**
     * If there is no argument to this option, assume true.
     */
    async getValue(argParams) {
        const params = Array.isArray(argParams) ? argParams : await argParams;
        if (params.length === 1) {
            let yes = ["true", "1", "yes", "y"].indexOf(params[0].toLowerCase()) >= 0;
            if (yes) {
                return Promise.resolve(true);
            }
            let no = ["false", "0", "no", "n"].indexOf(params[0].toLowerCase()) >= 0;
            if (no) {
                return Promise.resolve(false);
            }
            throw new Error("'" + params[0] + "' is not a recognized Boolean value.");
        }
        else if (params.length === 0) {
            return Promise.resolve(true);
        }
        else {
            throw new Error("Multiple values provided for Boolean Argument " + this.name + ".");
        }
    }
}
exports.BooleanArgument = BooleanArgument;
/**
 * Argument that reprents an int value.
 */
class IntArgument extends Argument {
    async getValue(argParams) {
        const params = Array.isArray(argParams) ? argParams : await argParams;
        if (params.length === 1) {
            let parseResult = parseInt(params[0], 10);
            if (isNaN(parseResult)) {
                throw new Error("Could not parse int argument " + this.name + ".");
            }
            return Promise.resolve(parseResult);
        }
        else if (params.length === 0) {
            throw new Error("No number provided for Int Argument " + this.name + ".");
        }
        else {
            throw new Error("Multiple values provided for Int Argument " + this.name + ".");
        }
    }
}
exports.IntArgument = IntArgument;
/**
 * Argument that reprents a float value.
 */
class FloatArgument extends Argument {
    async getValue(argParams) {
        const params = Array.isArray(argParams) ? argParams : await argParams;
        if (params.length === 1) {
            let parseResult = parseFloat(params[0]);
            if (isNaN(parseResult)) {
                throw new Error("Could not parse float argument " + this.name + ".");
            }
            return Promise.resolve(parseResult);
        }
        else if (params.length === 0) {
            throw new Error("No number provided for Float Argument " + this.name + ".");
        }
        else {
            throw new Error("Multiple values provided for Float Argument " + this.name + ".");
        }
    }
}
exports.FloatArgument = FloatArgument;
/**
 * Argument that represents a block of JSON.
 * Note: This class must be extended with a concrete type before its constructor
 * function can be referenced. See exec/extensions/default.ts for an example.
 */
class JsonArgument extends Argument {
    async getValue(argParams) {
        const params = Array.isArray(argParams) ? argParams : await argParams;
        try {
            return Promise.resolve(JSON.parse(params.join(" ")));
        }
        catch (parseError) {
            let info = parseError.stack || parseError.message;
            throw new Error("Failed to parse JSON argument " + this.name + ". Info: " + info);
        }
    }
}
exports.JsonArgument = JsonArgument;
/**
 * Argument that represents a string. Multiple values are joined together
 * by a single space.
 */
class StringArgument extends Argument {
    async getValue(argParams) {
        const params = Array.isArray(argParams) ? argParams : await argParams;
        return Promise.resolve(params.join(" "));
    }
}
exports.StringArgument = StringArgument;
/**
 * Argument that represents a string, however, if we ever have to
 * prompt the user for the value of this argument, we do not echo
 * out the value as it is typed. Good for passwords, tokens, etc.
 */
class SilentStringArgument extends StringArgument {
    constructor() {
        super(...arguments);
        this.silent = true;
    }
}
exports.SilentStringArgument = SilentStringArgument;
function getOptionsCache() {
    let cache = new diskcache_1.DiskCache("tfx");
    return cache.itemExists("cache", "command-options").then(cacheExists => {
        let existingCache = Promise.resolve("{}");
        if (cacheExists) {
            existingCache = cache.getItem("cache", "command-options");
        }
        return existingCache.then(cacheStr => {
            try {
                return JSON.parse(cacheStr);
            }
            catch (ex) {
                return {};
            }
        });
    });
}
exports.getOptionsCache = getOptionsCache;
//# sourceMappingURL=arguments.js.map