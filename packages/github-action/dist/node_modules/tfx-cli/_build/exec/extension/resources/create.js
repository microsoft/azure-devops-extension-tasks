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
exports.GenerateExtensionResources = exports.getCommand = void 0;
const merger_1 = require("../_lib/merger");
const vsix_writer_1 = require("../_lib/vsix-writer");
const Loc = __importStar(require("../_lib/loc"));
const colors = require("colors");
const extBase = require("../default");
const trace = require("../../../lib/trace");
function getCommand(args) {
    return new GenerateExtensionResources(args);
}
exports.getCommand = getCommand;
class GenerateExtensionResources extends extBase.ExtensionBase {
    constructor(passedArgs) {
        super(passedArgs);
        this.description = "Create a vsix package for an extension.";
        this.serverCommand = false;
    }
    getHelpArgs() {
        return [
            "root",
            "manifestJs",
            "env",
            "manifests",
            "manifestGlobs",
            "override",
            "overridesFile",
            "revVersion",
            "bypassScopeCheck",
            "bypassValidation",
            "publisher",
            "extensionId",
            "outputPath",
            "locRoot",
        ];
    }
    async exec() {
        return this.getMergeSettings().then(mergeSettings => {
            return this.getPackageSettings().then(packageSettings => {
                return new merger_1.Merger(mergeSettings).merge().then(components => {
                    const writer = new vsix_writer_1.VsixWriter(packageSettings, components);
                    const resjsonPath = writer.getOutputPath(packageSettings.outputPath, "resjson");
                    Loc.LocPrep.writeResourceFile(resjsonPath, components.resources.combined);
                    return {
                        resjsonPath: writer.getOutputPath(packageSettings.outputPath, "resjson"),
                    };
                });
            });
        });
    }
    friendlyOutput(data) {
        trace.info(colors.green("\n=== Completed operation: generate extension resources ==="));
        trace.info(" - .resjson: %s", data.resjsonPath);
    }
}
exports.GenerateExtensionResources = GenerateExtensionResources;
//# sourceMappingURL=create.js.map