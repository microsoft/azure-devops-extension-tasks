"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canWriteTo = exports.fileAccess = exports.exists = exports.F_OK = exports.X_OK = exports.R_OK = exports.W_OK = void 0;
const fs = require("fs");
// This is an fs lib that uses Q instead of callbacks.
exports.W_OK = fs.constants ? fs.constants.W_OK : fs.W_OK; // back-compat
exports.R_OK = fs.constants ? fs.constants.R_OK : fs.R_OK; // back-compat
exports.X_OK = fs.constants ? fs.constants.X_OK : fs.X_OK; // back-compat
exports.F_OK = fs.constants ? fs.constants.F_OK : fs.F_OK; // back-compat
function exists(path) {
    return new Promise(resolve => {
        fs.exists(path, fileExists => {
            resolve(fileExists);
        });
    });
}
exports.exists = exists;
/**
 * Returns a promise resolved true or false if a file is accessible
 * with the given mode (F_OK, R_OK, W_OK, X_OK)
 */
function fileAccess(path, mode = exports.F_OK) {
    return new Promise(resolve => {
        fs.access(path, mode, err => {
            if (err) {
                resolve(false);
            }
            else {
                resolve(true);
            }
        });
    });
}
exports.fileAccess = fileAccess;
/**
 * Given a valid path, resolves true if the file represented by the path
 * can be written to. Files that do not exist are assumed writable.
 */
function canWriteTo(path) {
    return exists(path).then(exists => {
        if (exists) {
            return fileAccess(path, exports.W_OK);
        }
        else {
            return true;
        }
    });
}
exports.canWriteTo = canWriteTo;
//# sourceMappingURL=fsUtils.js.map