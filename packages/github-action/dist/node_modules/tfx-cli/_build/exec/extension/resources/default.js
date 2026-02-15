"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionResourcesBase = exports.getCommand = void 0;
const ext = require("../default");
function getCommand(args) {
    return new ExtensionResourcesBase(args);
}
exports.getCommand = getCommand;
class ExtensionResourcesBase extends ext.ExtensionBase {
    constructor() {
        super(...arguments);
        this.description = "Commands for working with localization of extensions.";
        this.serverCommand = false;
    }
    exec(cmd) {
        return this.getHelp(cmd);
    }
}
exports.ExtensionResourcesBase = ExtensionResourcesBase;
//# sourceMappingURL=default.js.map