"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTfxVersion = exports.SemanticVersion = void 0;
const common = require("./common");
const path = require("path");
const dynamicVersion_1 = require("./dynamicVersion");
class SemanticVersion extends dynamicVersion_1.DynamicVersion {
    constructor(major, minor, patch) {
        super(major, minor, patch);
        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }
    /**
     * Parse a Semantic Version from a string.
     */
    static parse(version) {
        try {
            const spl = version.split(".").map(v => parseInt(v));
            if (spl.length === 3 && !spl.some(e => isNaN(e))) {
                return new SemanticVersion(spl[0], spl[1], spl[2]);
            }
            else {
                throw "";
            }
        }
        catch (e) {
            throw new Error("Could not parse '" + version + "' as a Semantic Version.");
        }
    }
}
exports.SemanticVersion = SemanticVersion;
function getTfxVersion() {
    let packageJson = require(path.join(common.APP_ROOT, "package.json"));
    return Promise.resolve(SemanticVersion.parse(packageJson.version));
}
exports.getTfxVersion = getTfxVersion;
//# sourceMappingURL=version.js.map