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
exports.TfCommand = void 0;
const diskcache_1 = require("../lib/diskcache");
const credstore_1 = require("../lib/credstore");
const common_1 = require("../lib/common");
const connection_1 = require("../lib/connection");
const WebApi_1 = require("azure-devops-node-api/WebApi");
const os_1 = require("os");
const _ = require("lodash");
const args = require("./arguments");
const colors_1 = require("colors");
const common = require("./common");
const fs_1 = require("fs");
const loader = require("../lib/loader");
const path = require("path");
const fsUtils = require("./fsUtils");
const util_1 = require("util");
const trace = require("./trace");
const version = require("./version");
const clipboardyWrite = (data) => Promise.resolve().then(() => __importStar(require('clipboardy'))).then(clipboardy => clipboardy.default.writeSync(data));
class TfCommand {
    /**
     * @param serverCommand True to initialize the WebApi object during init phase.
     */
    constructor(passedArgs) {
        this.passedArgs = passedArgs;
        this.commandArgs = {};
        this.description = "A suite of command line tools to interact with Azure DevOps Services.";
        this.setCommandArgs();
    }
    /**
     * Returns a promise that is resolved when this command is initialized and
     * ready to be executed.
     */
    ensureInitialized() {
        return this.initialized || this.initialize();
    }
    initialize() {
        // First validate arguments, then proceed with help or normal execution
        this.initialized = this.validateArguments().then(() => {
            return this.commandArgs.help.val().then(needHelp => {
                if (needHelp) {
                    return this.run.bind(this, this.getHelp.bind(this));
                }
                else {
                    // Set the fiddler proxy
                    return this.commandArgs.fiddler
                        .val()
                        .then(useProxy => {
                        if (useProxy) {
                            process.env.HTTP_PROXY = "http://127.0.0.1:8888";
                        }
                    })
                        .then(() => {
                        // Set custom proxy
                        return this.commandArgs.proxy.val(true).then(proxy => {
                            if (proxy) {
                                process.env.HTTP_PROXY = proxy;
                            }
                        });
                    })
                        .then(() => {
                        // Set the no-prompt flag
                        return this.commandArgs.noPrompt.val(true).then(noPrompt => {
                            common.NO_PROMPT = noPrompt;
                        });
                    })
                        .then(() => {
                        // If --no-color specified, Patch console.log to never output color bytes
                        return this.commandArgs.noColor.val(true).then(noColor => {
                            if (noColor) {
                                console.log = logNoColors;
                            }
                        });
                    })
                        .then(() => {
                        // Set the cached service url
                        return this.commandArgs.serviceUrl.val(true).then(serviceUrl => {
                            if (!serviceUrl && !process.env["TFX_BYPASS_CACHE"] && common.EXEC_PATH.join("") !== "login") {
                                let diskCache = new diskcache_1.DiskCache("tfx");
                                return diskCache.itemExists("cache", "connection").then(isConnection => {
                                    let connectionUrlPromise;
                                    if (!isConnection) {
                                        connectionUrlPromise = Promise.resolve(null);
                                    }
                                    else {
                                        connectionUrlPromise = diskCache.getItem("cache", "connection");
                                    }
                                    return connectionUrlPromise.then(url => {
                                        if (url) {
                                            this.commandArgs.serviceUrl.setValue(url);
                                        }
                                    });
                                });
                            }
                            else {
                                return Promise.resolve(null);
                            }
                        });
                    })
                        .then(() => {
                        let apiPromise = Promise.resolve(null);
                        if (this.serverCommand) {
                            apiPromise = this.getWebApi().then(_ => { });
                        }
                        return apiPromise.then(() => {
                            return this.run.bind(this, this.exec.bind(this));
                        });
                    });
                }
            });
        });
        return this.initialized;
    }
    getGroupedArgs() {
        if (!this.groupedArgs) {
            let group = {};
            let currentArg = null;
            this.passedArgs.forEach(arg => {
                if (_.startsWith(arg, "--")) {
                    currentArg = _.camelCase(arg.substr(2));
                    group[currentArg] = [];
                    return;
                }
                // short args/alias support - allow things like -abc "cat" "dog"
                // which means the same as --arg-a --arg-b --arg-c "cat" "dog"
                if (_.startsWith(arg, "-")) {
                    const shorthandArgs = arg.substr(1).split("");
                    for (const shArg of shorthandArgs) {
                        const shorthandArg = "-" + shArg;
                        group[shorthandArg] = [];
                        currentArg = shorthandArg;
                    }
                    return;
                }
                if (currentArg) {
                    group[currentArg].push(arg);
                }
            });
            this.groupedArgs = group;
        }
        return this.groupedArgs;
    }
    /**
     * Validates that all provided arguments are recognized by the command.
     * Shows error and help if invalid arguments are found.
     */
    validateArguments() {
        const groupedArgs = this.getGroupedArgs();
        const providedArgs = Object.keys(groupedArgs);
        // Get all valid argument names (including aliases) for this command
        const validArgNames = new Set();
        // Add all registered argument names and aliases
        Object.keys(this.commandArgs).forEach(argName => {
            const argObj = this.commandArgs[argName];
            validArgNames.add(argName);
            // Add aliases
            if (argObj.aliases) {
                argObj.aliases.forEach(alias => {
                    validArgNames.add(alias);
                });
            }
        });
        // Check for invalid arguments
        const invalidArgs = providedArgs.filter(arg => !validArgNames.has(arg));
        if (invalidArgs.length > 0) {
            const errorMessage = `Unrecognized argument${invalidArgs.length > 1 ? 's' : ''}: ${invalidArgs.map(arg => arg.startsWith('-') ? arg : '--' + _.kebabCase(arg)).join(', ')}`;
            // Log the error and then show help
            trace.error(errorMessage);
            // Set help flag to true so help will be shown
            this.commandArgs.help.setValue(true);
        }
        return Promise.resolve();
    }
    /**
     * Registers an argument that this command can accept from the command line
     *
     * @param name Name of the argument. This is what is passed in on the command line, e.g. "authType"
     *        is passed in with --auth-type. Can be an array for aliases, but the first item is how the
     *        argument's value is accessed, e.g. this.commandArgs.authType.val().
     *        An argument can have one shorthand argument: a dash followed by a single letter. This is
     *        passed at the command line with a single dash, e.g. -u. Multiple boolean shorthand arguments
     *        can be passed with a single dash: -abcd. See setCommandArgs for usage examples.
     * @param friendlyName Name to display to the user in help.
     * @param description Description to display in help.
     * @param ctor Constructor for the type of argument this is (e.g. string, number, etc.)
     * @param defaultValue Default value of the argument, null for no default, undefined to prompt the user.
     */
    registerCommandArgument(name, friendlyName, description, ctor, defaultValue, undocumented = false, promptDefault) {
        const fixedArgNames = (typeof name === "string" ? [name] : name).map(a => (a.substr(0, 2) === "--" ? a.substr(0, 2) : a));
        const argName = fixedArgNames[0];
        const argAliases = fixedArgNames.slice(1);
        let groupedArgs = this.getGroupedArgs();
        let argValue = groupedArgs[argName];
        if (argValue === undefined) {
            for (const alias of argAliases) {
                if (groupedArgs[alias]) {
                    argValue = groupedArgs[alias];
                    break;
                }
            }
        }
        if (argValue) {
            this.commandArgs[argName] = new ctor(argName, friendlyName, description, argValue, false, argAliases, undocumented);
        }
        else {
            let def = null;
            if (typeof defaultValue === "function") {
                def = defaultValue();
            }
            else {
                def = defaultValue;
            }
            this.commandArgs[argName] = new ctor(argName, friendlyName, description, def, true, argAliases, undocumented, promptDefault);
        }
    }
    /**
     * Register arguments that may be used with this command.
     */
    setCommandArgs() {
        this.registerCommandArgument(["project", "-p"], "Project name", null, args.StringArgument);
        this.registerCommandArgument(["root", "-r"], "Root directory", null, args.ExistingDirectoriesArgument, ".");
        this.registerCommandArgument(["authType"], "Authentication Method", "Method of authentication ('pat' or 'basic').", args.StringArgument, "pat");
        this.registerCommandArgument(["serviceUrl", "-u"], "Service URL", "URL to the service you will connect to, e.g. https://youraccount.visualstudio.com/DefaultCollection.", args.StringArgument);
        this.registerCommandArgument(["password"], "Password", "Password to use for basic authentication.", args.SilentStringArgument);
        this.registerCommandArgument(["token", "-t"], "Personal access token", null, args.SilentStringArgument);
        this.registerCommandArgument(["save"], "Save settings", "Save arguments for the next time a command in this command group is run.", args.BooleanArgument, "false");
        this.registerCommandArgument(["username"], "Username", "Username to use for basic authentication.", args.StringArgument);
        this.registerCommandArgument(["output"], "Output destination", "Method to use for output. Options: friendly, json, clipboard.", args.StringArgument, "friendly");
        this.registerCommandArgument(["json"], "Output as JSON", "Alias for --output json.", args.BooleanArgument, "false");
        this.registerCommandArgument(["fiddler"], "Use Fiddler proxy", "Set up the fiddler proxy for HTTP requests (for debugging purposes).", args.BooleanArgument, "false");
        this.registerCommandArgument(["proxy"], "Proxy server", "Use the specified proxy server for HTTP traffic.", args.StringArgument, null);
        this.registerCommandArgument(["help", "-h"], "Help", "Get help for any command.", args.BooleanArgument, "false");
        this.registerCommandArgument(["noPrompt"], "No Prompt", "Do not prompt the user for input (instead, raise an error).", args.BooleanArgument, "false");
        this.registerCommandArgument("includeUndocumented", "Include undocumented commands?", "Show help for commands and options that are undocumented (use at your own risk!)", args.BooleanArgument, "false");
        this.registerCommandArgument("traceLevel", "Trace Level", `Tracing threshold can be specified as "none", "info" (default), and "debug".`, args.StringArgument, null);
        this.registerCommandArgument("noColor", "No colored output", "Do not emit bytes that affect text color in any output.", args.BooleanArgument, "false");
        this.registerCommandArgument("debugLogStream", "Debug message logging stream (stdout | stderr)", "Stream used for writing debug logs (stdout or stderr)", args.StringArgument, "stdout");
        this.registerCommandArgument("skipCertValidation", "Skip Certificate Validation", "Skip certificate validation during login", args.BooleanArgument, "false");
    }
    /**
     * Return a list of registered arguments that should be displayed when help is emitted.
     */
    getHelpArgs() {
        return [];
    }
    /**
     * Get a BasicCredentialHandler based on the command arguments:
     * If username & password are passed in, use those.
     * If token is passed in, use that.
     * Else, check the authType - if it is "pat", prompt for a token
     * If it is "basic", prompt for username and password.
     */
    getCredentials(serviceUrl, useCredStore = true) {
        return Promise.all([
            this.commandArgs.authType.val(),
            this.commandArgs.token.val(true),
            this.commandArgs.username.val(true),
            this.commandArgs.password.val(true),
        ]).then(values => {
            const [authType, token, username, password] = values;
            if (username && password) {
                return (0, WebApi_1.getBasicHandler)(username, password);
            }
            else {
                if (token) {
                    return (0, WebApi_1.getBasicHandler)("OAuth", token);
                }
                else {
                    let getCredentialPromise;
                    if (useCredStore) {
                        getCredentialPromise = (0, credstore_1.getCredentialStore)("tfx").getCredential(serviceUrl, "allusers");
                    }
                    else {
                        getCredentialPromise = Promise.reject("not using cred store.");
                    }
                    return getCredentialPromise
                        .then((credString) => {
                        if (credString.length <= 6) {
                            throw "Could not get credentials from credential store.";
                        }
                        if (credString.substr(0, 3) === "pat") {
                            return (0, WebApi_1.getBasicHandler)("OAuth", credString.substr(4));
                        }
                        else if (credString.substr(0, 5) === "basic") {
                            let rest = credString.substr(6);
                            let unpwDividerIndex = rest.indexOf(":");
                            let username = rest.substr(0, unpwDividerIndex);
                            let password = rest.substr(unpwDividerIndex + 1);
                            if (username && password) {
                                return (0, WebApi_1.getBasicHandler)(username, password);
                            }
                            else {
                                throw "Could not get credentials from credential store.";
                            }
                        }
                    })
                        .catch(() => {
                        if (authType.toLowerCase() === "pat") {
                            return this.commandArgs.token.val().then(token => {
                                return (0, WebApi_1.getBasicHandler)("OAuth", token);
                            });
                        }
                        else if (authType.toLowerCase() === "basic") {
                            return this.commandArgs.username.val().then(username => {
                                return this.commandArgs.password.val().then(password => {
                                    return (0, WebApi_1.getBasicHandler)(username, password);
                                });
                            });
                        }
                        else {
                            throw new Error("Unsupported auth type. Currently, 'pat' and 'basic' auth are supported.");
                        }
                    });
                }
            }
        });
    }
    async getWebApi(options) {
        // try to get value of skipCertValidation from cache
        const tfxCache = new diskcache_1.DiskCache("tfx");
        if (await tfxCache.itemExists("cache", "skipCertValidation")) {
            const skipCertValidation = await tfxCache.getItem("cache", "skipCertValidation");
            options = { ...options, ignoreSslError: skipCertValidation };
        }
        return this.commandArgs.serviceUrl.val().then(url => {
            return this.getCredentials(url).then(handler => {
                this.connection = new connection_1.TfsConnection(url);
                this.webApi = new WebApi_1.WebApi(url, handler, options);
                return this.webApi;
            });
        });
    }
    run(main, cmd) {
        return main(cmd).then(result => {
            return this.output(result).then(() => {
                return this.dispose();
            });
        });
    }
    /**
     * Should be called after exec. In here we will write settings to fs if necessary.
     */
    dispose() {
        let newToCache = {};
        return this.commandArgs.save.val().then(shouldSave => {
            if (shouldSave) {
                let cacheKey = path.resolve().replace("/.[]/g", "-") +
                    "." +
                    common.EXEC_PATH.slice(0, common.EXEC_PATH.length - 1).join("/");
                let getValuePromises = [];
                Object.keys(this.commandArgs).forEach(arg => {
                    let argObj = this.commandArgs[arg];
                    if (!argObj.hasDefaultValue) {
                        let pr = argObj.val().then(value => {
                            // don't cache these 5 options.
                            if (["username", "password", "save", "token", "help"].indexOf(arg) < 0) {
                                _.set(newToCache, cacheKey + "." + arg, value);
                            }
                        });
                        getValuePromises.push(pr);
                    }
                });
                return Promise.all(getValuePromises).then(() => {
                    return args.getOptionsCache().then(existingCache => {
                        // custom shallow-ish merge of cache properties.
                        let newInThisCommand = _.get(newToCache, cacheKey);
                        if (!_.get(existingCache, cacheKey)) {
                            _.set(existingCache, cacheKey, {});
                        }
                        if (newInThisCommand) {
                            Object.keys(newInThisCommand).forEach(key => {
                                _.set(existingCache, cacheKey + "." + key, newInThisCommand[key]);
                            });
                            new diskcache_1.DiskCache("tfx").setItem("cache", "command-options", JSON.stringify(existingCache, null, 4).replace(/\n/g, os_1.EOL));
                        }
                    });
                });
            }
            else {
                return Promise.resolve(null);
            }
        });
    }
    /**
     * Gets help (as a string) for the given command
     */
    async getHelp(cmd) {
        const includeUndocumented = await this.commandArgs.includeUndocumented.val();
        this.commandArgs.output.setValue("help");
        let result = os_1.EOL;
        let continuedHierarchy = cmd.commandHierarchy;
        cmd.execPath.forEach(segment => {
            continuedHierarchy = continuedHierarchy[segment];
        });
        if (continuedHierarchy === null) {
            // Need help with a particular command
            let singleArgData = (argName, maxArgLen) => {
                // Lodash's kebab adds a dash between letters and numbers, so this is just a hack to avoid that.
                let argKebab = argName === "json5" ? "json5" : _.kebabCase(argName);
                const argObj = this.commandArgs[argName];
                const shorthandArg = argObj.aliases.filter(a => a.length === 2 && a.substr(0, 1) === "-")[0];
                if (shorthandArg) {
                    argKebab = `${argKebab}, ${shorthandArg}`;
                }
                if (argObj.undocumented && !includeUndocumented) {
                    return "";
                }
                return ("  --" +
                    argKebab +
                    "  " +
                    (0, common_1.repeatStr)(" ", maxArgLen - argKebab.length) +
                    (0, colors_1.gray)(argObj.description || argObj.friendlyName + ".") +
                    os_1.EOL);
            };
            let commandName = cmd.execPath[cmd.execPath.length - 1];
            result +=
                (0, colors_1.cyan)("Syntax: ") +
                    os_1.EOL +
                    (0, colors_1.cyan)("tfx ") +
                    (0, colors_1.yellow)(cmd.execPath.join(" ")) +
                    (0, colors_1.green)(" --arg1 arg1val1 arg1val2[...]") +
                    (0, colors_1.gray)(" --arg2 arg2val1 arg2val2[...]") +
                    os_1.EOL +
                    os_1.EOL;
            return loader
                .load(cmd.execPath, ["--service-url", "null"])
                .then(tfCommand => {
                result += (0, colors_1.cyan)("Command: ") + commandName + os_1.EOL;
                result += tfCommand.description + os_1.EOL + os_1.EOL;
                result += (0, colors_1.cyan)("Arguments: ") + os_1.EOL;
                let uniqueArgs = this.getHelpArgs();
                uniqueArgs = _.uniq(uniqueArgs);
                let maxArgLen = uniqueArgs.map(a => _.kebabCase(a)).reduce((a, b) => Math.max(a, b.length), 0);
                if (uniqueArgs.length === 0) {
                    result += "[No arguments for this command]" + os_1.EOL;
                }
                uniqueArgs.forEach(arg => {
                    result += singleArgData(arg, maxArgLen);
                });
                if (this.serverCommand) {
                    result += os_1.EOL + (0, colors_1.cyan)("Global server command arguments:") + os_1.EOL;
                    ["authType", "username", "password", "token", "serviceUrl", "fiddler", "proxy", "skipCertValidation"].forEach(arg => {
                        result += singleArgData(arg, 11);
                    });
                }
                result += os_1.EOL + (0, colors_1.cyan)("Global arguments:") + os_1.EOL;
                ["help", "save", "noColor", "noPrompt", "output", "json", "traceLevel", "debugLogStream"].forEach(arg => {
                    result += singleArgData(arg, 9);
                });
                result +=
                    os_1.EOL +
                        (0, colors_1.gray)("To see more commands, type " +
                            (0, colors_1.reset)("tfx " + cmd.execPath.slice(0, cmd.execPath.length - 1).join(" ") + " --help"));
            })
                .then(() => {
                return result;
            });
        }
        else {
            // Need help with a suite of commands
            // There is a weird coloring bug when colors are nested, so we don't do that.
            result +=
                (0, colors_1.cyan)("Available ") +
                    "commands" +
                    (0, colors_1.cyan)(" and ") +
                    (0, colors_1.yellow)("command groups") +
                    (0, colors_1.cyan)(" in " + ["tfx"].concat(cmd.execPath).join(" / ") + ":") +
                    os_1.EOL;
            let commandDescriptionPromises = [];
            Object.keys(continuedHierarchy).forEach(command => {
                if (command === "default") {
                    return;
                }
                let pr = loader.load(cmd.execPath.concat([command]), ["--service-url", "null"]).then(tfCommand => {
                    let coloredCommand = command;
                    if (continuedHierarchy[command] !== null) {
                        coloredCommand = (0, colors_1.yellow)(command);
                    }
                    result += " - " + coloredCommand + (0, colors_1.gray)(": " + tfCommand.description) + os_1.EOL;
                });
                commandDescriptionPromises.push(pr);
            });
            return Promise.all(commandDescriptionPromises)
                .then(() => {
                result +=
                    os_1.EOL +
                        os_1.EOL +
                        (0, colors_1.gray)("For help with an individual command, type ") +
                        (0, colors_1.reset)("tfx " + cmd.execPath.join(" ") + " <command> --help") +
                        os_1.EOL;
            })
                .then(() => {
                return result;
            });
        }
    }
    /**
     * Display a copyright banner.
     */
    showBanner() {
        return this.commandArgs.json
            .val(true)
            .then(useJson => {
            if (useJson) {
                this.commandArgs.output.setValue("json");
            }
        })
            .then(() => {
            return version.getTfxVersion().then(async (semVer) => {
                const [outputType, traceLevel, debugLogStream] = await Promise.all([
                    this.commandArgs.output.val(),
                    this.commandArgs.traceLevel.val(),
                    this.commandArgs.debugLogStream.val(),
                ]);
                switch (debugLogStream) {
                    case "stdout":
                        trace.debugLogStream = console.log;
                        break;
                    case "stderr":
                        trace.debugLogStream = console.error;
                        break;
                    default:
                        throw new Error("Parameter --debug-log-stream must have value 'stdout' or 'stderr'.");
                }
                switch (traceLevel && traceLevel.toLowerCase()) {
                    case "none":
                        trace.traceLevel = 0 /* trace.TraceLevel.None */;
                        break;
                    case "debug":
                        trace.traceLevel = 2 /* trace.TraceLevel.Debug */;
                        break;
                    case "info":
                        trace.traceLevel = 1 /* trace.TraceLevel.Info */;
                        break;
                    default:
                        trace.traceLevel = outputType === "friendly" ? 1 /* trace.TraceLevel.Info */ : 0 /* trace.TraceLevel.None */;
                }
                trace.info((0, colors_1.gray)("TFS Cross Platform Command Line Interface v" + semVer.toString()));
                trace.info((0, colors_1.gray)("Copyright Microsoft Corporation"));
            });
        });
    }
    /**
     * Takes data and pipes it to the appropriate output mechanism
     */
    output(data) {
        return this.commandArgs.output.val().then(outputDestination => {
            switch (outputDestination.toLowerCase()) {
                case "friendly":
                    this.friendlyOutput(data);
                    break;
                case "json":
                    this.jsonOutput(data);
                    break;
                case "help":
                    this.friendlyOutputConstant(data);
                    break;
                case "clip":
                case "clipboard":
                    let clipboardText = this.getClipboardOutput(data);
                    return clipboardyWrite(clipboardText);
                default:
                    return fsUtils.canWriteTo(path.resolve(outputDestination)).then(canWrite => {
                        if (canWrite) {
                            let fileContents = this.getFileOutput(data);
                            return (0, util_1.promisify)(fs_1.writeFile)(outputDestination, fileContents);
                        }
                        else {
                            throw new Error("Cannot write output to " + outputDestination);
                        }
                    });
            }
            return Promise.resolve(null);
        });
    }
    /**
     * Given the output object, gets the string that is copied to the clipboard when
     * clipboard output is requested.
     */
    getClipboardOutput(data) {
        return this.getOutputString(data);
    }
    /**
     * Given the output object, gets the string that is written to a destination
     * file when a file name is given as the output destination
     */
    getFileOutput(data) {
        return this.getOutputString(data);
    }
    getOutputString(data) {
        let outputString = "";
        try {
            outputString = JSON.stringify(data, null, 4);
        }
        catch (e) {
            if (data && data.toString) {
                outputString = data.toString();
            }
            else {
                outputString = data + "";
            }
        }
        return outputString;
    }
    /**
     * Gets a nicely formatted output string for friendly output
     */
    friendlyOutput(data) {
        this.friendlyOutputConstant(data);
    }
    friendlyOutputConstant(data) {
        if (typeof data === "string") {
            console.log(data);
        }
        else {
            try {
                console.log(JSON.stringify(data, null, 4));
            }
            catch (e) {
                console.log(data + "");
            }
        }
    }
    /**
     * Gets a string of valid JSON when JSON output is requested.
     * Probably no need to override this one.
     */
    jsonOutput(data) {
        try {
            console.log((0, colors_1.stripColors)(JSON.stringify(data, null, 4)));
        }
        catch (e) {
            throw new Error("Could not stringify JSON output.");
        }
    }
}
exports.TfCommand = TfCommand;
const originalConsoleLog = console.log.bind(console);
function logNoColors(...args) {
    originalConsoleLog.apply(console, args.map(colors_1.stripColors));
}
//# sourceMappingURL=tfcommand.js.map