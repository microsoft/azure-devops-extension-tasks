"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicVersion = void 0;
class DynamicVersion {
    constructor(...numbers) {
        if (numbers.some(n => n < 0)) {
            throw new Error("Version numbers must be non-negative.");
        }
        if (numbers.every(n => n === 0)) {
            throw new Error("Version must be greater than 0.0.0");
        }
        this.numbers = numbers;
    }
    /**
     * Parse a DynamicVersion from a string.
     */
    static parse(version) {
        try {
            const splitVersion = version.split(".").map(v => parseInt(v));
            if (!splitVersion.some(e => isNaN(e))) {
                return new DynamicVersion(...splitVersion);
            }
            else {
                throw "";
            }
        }
        catch (e) {
            throw new Error("Could not parse '" + version + "' as a Semantic Version.");
        }
    }
    /**
     * Increase the last number of a dynamic version and returns the new version.
     */
    static increase(version) {
        const newVersion = version.numbers;
        newVersion[newVersion.length - 1] = newVersion[newVersion.length - 1] + 1;
        return new DynamicVersion(...newVersion);
    }
    /**
     * Return a string-representation of this dynamic version, e.g. 2.10.5.42
     */
    toString() {
        return this.numbers.join(".");
    }
    /**
     * Return < 0 if this version is less than other,
     * > 0 if this version is greater than other,
     * and 0 if they are equal.
     *
     * If this version length is less than than other
     * this version is less than other.
     */
    compareTo(other) {
        // [2,0,7] --- [2,0,7,1]
        for (let i = 0; i < Math.min(this.numbers.length, other.numbers.length); ++i) {
            const thisV = this.numbers[i];
            const otherV = other.numbers[i];
            if (thisV !== otherV) {
                return thisV - otherV;
            }
        }
        return this.numbers.length - other.numbers.length;
    }
}
exports.DynamicVersion = DynamicVersion;
//# sourceMappingURL=dynamicVersion.js.map