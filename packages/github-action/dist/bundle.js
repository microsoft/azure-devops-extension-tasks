var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// packages/core/dist/manifest-reader.js
var ManifestReader;
var init_manifest_reader = __esm({
  "packages/core/dist/manifest-reader.js"() {
    "use strict";
    ManifestReader = class {
      /**
       * Read all task manifests in the extension
       * Default implementation using findTaskPaths() and readTaskManifest()
       * Subclasses can override for optimization
       * @returns Array of task manifests with their paths
       */
      async readTaskManifests() {
        const taskPaths = await this.findTaskPaths();
        const results = [];
        for (const taskPath of taskPaths) {
          try {
            const manifest = await this.readTaskManifest(taskPath);
            results.push({ path: taskPath, manifest });
          } catch {
          }
        }
        return results;
      }
      /**
       * Get quick metadata about the extension
       * Default implementation using readExtensionManifest()
       * @returns Extension metadata
       */
      async getMetadata() {
        const manifest = await this.readExtensionManifest();
        return {
          publisher: manifest.publisher,
          extensionId: manifest.id,
          version: manifest.version,
          name: manifest.name,
          description: manifest.description
        };
      }
      /**
       * Get information about all tasks in the extension
       * Default implementation using readTaskManifests()
       * @returns Array of task information
       */
      async getTasksInfo() {
        const tasks = await this.readTaskManifests();
        return tasks.map(({ path: path10, manifest }) => ({
          name: manifest.name,
          friendlyName: manifest.friendlyName,
          version: `${manifest.version.Major}.${manifest.version.Minor}.${manifest.version.Patch}`,
          path: path10
        }));
      }
    };
  }
});

// node_modules/uuid/dist-node/regex.js
var regex_default;
var init_regex = __esm({
  "node_modules/uuid/dist-node/regex.js"() {
    regex_default = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;
  }
});

// node_modules/uuid/dist-node/validate.js
function validate(uuid) {
  return typeof uuid === "string" && regex_default.test(uuid);
}
var validate_default;
var init_validate = __esm({
  "node_modules/uuid/dist-node/validate.js"() {
    init_regex();
    validate_default = validate;
  }
});

// node_modules/uuid/dist-node/parse.js
function parse(uuid) {
  if (!validate_default(uuid)) {
    throw TypeError("Invalid UUID");
  }
  let v;
  return Uint8Array.of((v = parseInt(uuid.slice(0, 8), 16)) >>> 24, v >>> 16 & 255, v >>> 8 & 255, v & 255, (v = parseInt(uuid.slice(9, 13), 16)) >>> 8, v & 255, (v = parseInt(uuid.slice(14, 18), 16)) >>> 8, v & 255, (v = parseInt(uuid.slice(19, 23), 16)) >>> 8, v & 255, (v = parseInt(uuid.slice(24, 36), 16)) / 1099511627776 & 255, v / 4294967296 & 255, v >>> 24 & 255, v >>> 16 & 255, v >>> 8 & 255, v & 255);
}
var parse_default;
var init_parse = __esm({
  "node_modules/uuid/dist-node/parse.js"() {
    init_validate();
    parse_default = parse;
  }
});

// node_modules/uuid/dist-node/stringify.js
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
var byteToHex;
var init_stringify = __esm({
  "node_modules/uuid/dist-node/stringify.js"() {
    byteToHex = [];
    for (let i = 0; i < 256; ++i) {
      byteToHex.push((i + 256).toString(16).slice(1));
    }
  }
});

// node_modules/uuid/dist-node/v35.js
function stringToBytes(str) {
  str = unescape(encodeURIComponent(str));
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; ++i) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
}
function v35(version, hash, value, namespace, buf, offset) {
  const valueBytes = typeof value === "string" ? stringToBytes(value) : value;
  const namespaceBytes = typeof namespace === "string" ? parse_default(namespace) : namespace;
  if (typeof namespace === "string") {
    namespace = parse_default(namespace);
  }
  if (namespace?.length !== 16) {
    throw TypeError("Namespace must be array-like (16 iterable integer values, 0-255)");
  }
  let bytes = new Uint8Array(16 + valueBytes.length);
  bytes.set(namespaceBytes);
  bytes.set(valueBytes, namespaceBytes.length);
  bytes = hash(bytes);
  bytes[6] = bytes[6] & 15 | version;
  bytes[8] = bytes[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = bytes[i];
    }
    return buf;
  }
  return unsafeStringify(bytes);
}
var DNS, URL2;
var init_v35 = __esm({
  "node_modules/uuid/dist-node/v35.js"() {
    init_parse();
    init_stringify();
    DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    URL2 = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
  }
});

// node_modules/uuid/dist-node/sha1.js
import { createHash } from "node:crypto";
function sha1(bytes) {
  if (Array.isArray(bytes)) {
    bytes = Buffer.from(bytes);
  } else if (typeof bytes === "string") {
    bytes = Buffer.from(bytes, "utf8");
  }
  return createHash("sha1").update(bytes).digest();
}
var sha1_default;
var init_sha1 = __esm({
  "node_modules/uuid/dist-node/sha1.js"() {
    sha1_default = sha1;
  }
});

// node_modules/uuid/dist-node/v5.js
function v5(value, namespace, buf, offset) {
  return v35(80, sha1_default, value, namespace, buf, offset);
}
var v5_default;
var init_v5 = __esm({
  "node_modules/uuid/dist-node/v5.js"() {
    init_sha1();
    init_v35();
    v5.DNS = DNS;
    v5.URL = URL2;
    v5_default = v5;
  }
});

// node_modules/uuid/dist-node/index.js
var init_dist_node = __esm({
  "node_modules/uuid/dist-node/index.js"() {
    init_v5();
  }
});

// packages/core/dist/vsix-reader.js
var vsix_reader_exports = {};
__export(vsix_reader_exports, {
  VsixReader: () => VsixReader
});
import { Buffer as Buffer2 } from "buffer";
import { isAbsolute, normalize } from "path";
import yauzl from "yauzl";
function validateZipPath(filePath) {
  const normalizedPath = normalize(filePath);
  if (isAbsolute(normalizedPath)) {
    throw new Error(`Security: Absolute paths are not allowed in VSIX files: ${filePath}`);
  }
  if (normalizedPath.startsWith("..") || normalizedPath.includes(`${normalize("../")}`)) {
    throw new Error(`Security: Path traversal detected in VSIX file: ${filePath}`);
  }
  const suspiciousPatterns = [
    /\.\.[/\\]/,
    // Parent directory references
    /^[/\\]/,
    // Root references
    /[<>:"|?*]/
    // Windows invalid filename characters (except for paths)
  ];
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(filePath)) {
      throw new Error(`Security: Suspicious pattern detected in path: ${filePath}`);
    }
  }
  if (filePath.includes("\0")) {
    throw new Error(`Security: Null byte detected in path: ${filePath}`);
  }
}
var VsixReader;
var init_vsix_reader = __esm({
  "packages/core/dist/vsix-reader.js"() {
    "use strict";
    init_manifest_reader();
    VsixReader = class _VsixReader extends ManifestReader {
      zipFile = null;
      vsixPath;
      fileCache = /* @__PURE__ */ new Map();
      entriesCache = null;
      constructor(vsixPath) {
        super();
        this.vsixPath = vsixPath;
      }
      /**
       * Open a VSIX file for reading
       * @param vsixPath Path to the VSIX file
       * @returns VsixReader instance
       */
      static async open(vsixPath) {
        const reader = new _VsixReader(vsixPath);
        await reader.openZip();
        return reader;
      }
      /**
       * Open the ZIP file
       */
      async openZip() {
        return new Promise((resolve, reject) => {
          yauzl.open(this.vsixPath, {
            lazyEntries: true,
            strictFileNames: false,
            validateEntrySizes: false,
            autoClose: false
            // Keep file open for multiple read operations
          }, (err, zipFile) => {
            if (err) {
              reject(new Error(`Failed to open VSIX file: ${err.message}`));
              return;
            }
            this.zipFile = zipFile;
            resolve();
          });
        });
      }
      /**
       * Read all entries from the ZIP file
       * Validates all paths for security (zip slip protection)
       */
      async readEntries() {
        if (this.entriesCache) {
          return this.entriesCache;
        }
        if (!this.zipFile) {
          throw new Error("VSIX file is not open");
        }
        return new Promise((resolve, reject) => {
          const entries = [];
          const onEntry = (entry) => {
            try {
              validateZipPath(entry.fileName);
              entries.push(entry);
            } catch (err) {
              this.zipFile.removeListener("entry", onEntry);
              this.zipFile.removeListener("end", onEnd);
              this.zipFile.removeListener("error", onError);
              reject(err);
              return;
            }
            this.zipFile.readEntry();
          };
          const onEnd = () => {
            this.zipFile.removeListener("entry", onEntry);
            this.zipFile.removeListener("end", onEnd);
            this.zipFile.removeListener("error", onError);
            this.entriesCache = entries;
            resolve(entries);
          };
          const onError = (err) => {
            this.zipFile.removeListener("entry", onEntry);
            this.zipFile.removeListener("end", onEnd);
            this.zipFile.removeListener("error", onError);
            reject(new Error(`Error reading VSIX entries: ${err.message}`));
          };
          this.zipFile.on("entry", onEntry);
          this.zipFile.on("end", onEnd);
          this.zipFile.on("error", onError);
          this.zipFile.readEntry();
        });
      }
      /**
       * Read a specific file from the VSIX
       * @param filePath Path to the file within the VSIX
       * @returns File contents as Buffer
       */
      async readFile(filePath) {
        validateZipPath(filePath);
        const normalizedPath = filePath.replace(/\\/g, "/");
        if (this.fileCache.has(normalizedPath)) {
          return this.fileCache.get(normalizedPath);
        }
        if (!this.zipFile) {
          throw new Error("VSIX file is not open");
        }
        const entries = await this.readEntries();
        const entry = entries.find((e) => e.fileName === normalizedPath);
        if (!entry) {
          throw new Error(`File not found in VSIX: ${filePath}`);
        }
        return new Promise((resolve, reject) => {
          this.zipFile.openReadStream(entry, (err, readStream) => {
            if (err || !readStream) {
              reject(new Error(`Failed to read file ${filePath}: ${err?.message || "No stream"}`));
              return;
            }
            const chunks = [];
            readStream.on("data", (chunk) => chunks.push(chunk));
            readStream.on("end", () => {
              const buffer = Buffer2.concat(chunks);
              this.fileCache.set(normalizedPath, buffer);
              resolve(buffer);
            });
            readStream.on("error", (streamErr) => {
              reject(new Error(`Error reading file ${filePath}: ${streamErr.message}`));
            });
          });
        });
      }
      /**
       * Check if a file exists in the VSIX
       * @param filePath Path to check
       * @returns True if file exists
       */
      async fileExists(filePath) {
        const normalizedPath = filePath.replace(/\\/g, "/");
        const entries = await this.readEntries();
        return entries.some((e) => e.fileName === normalizedPath);
      }
      /**
       * List all files in the VSIX
       * @returns Array of file information
       */
      async listFiles() {
        const entries = await this.readEntries();
        return entries.filter((e) => !e.fileName.endsWith("/")).map((e) => ({
          path: e.fileName,
          size: e.uncompressedSize,
          compressedSize: e.compressedSize
        }));
      }
      /**
       * Read the extension manifest (vss-extension.json or extension.vsixmanifest)
       * @returns Parsed extension manifest
       */
      async readExtensionManifest() {
        if (await this.fileExists("extension.vsomanifest")) {
          const buffer = await this.readFile("extension.vsomanifest");
          return JSON.parse(buffer.toString("utf-8"));
        }
        if (await this.fileExists("vss-extension.json")) {
          const buffer = await this.readFile("vss-extension.json");
          return JSON.parse(buffer.toString("utf-8"));
        }
        throw new Error("Extension manifest not found in VSIX (expected vss-extension.json or extension.vsomanifest)");
      }
      /**
       * Find task directories from the extension manifest
       * @returns Array of task directory paths
       */
      async findTaskPaths() {
        const manifest = await this.readExtensionManifest();
        const taskPathsSet = /* @__PURE__ */ new Set();
        if (manifest.contributions) {
          for (const contribution of manifest.contributions) {
            if (contribution.type === "ms.vss-distributed-task.task" && contribution.properties) {
              const name = contribution.properties.name;
              if (name) {
                taskPathsSet.add(name);
              }
            }
          }
        }
        if (taskPathsSet.size === 0 && manifest.files) {
          const entries = await this.readEntries();
          for (const file of manifest.files) {
            const taskJsonPath = `${file.path}/task.json`.replace(/\\/g, "/");
            if (entries.some((e) => e.fileName === taskJsonPath)) {
              taskPathsSet.add(file.path);
            }
          }
        }
        return Array.from(taskPathsSet);
      }
      /**
       * Read a task manifest (task.json)
       * @param taskPath Path to the task directory
       * @returns Parsed task manifest
       */
      async readTaskManifest(taskPath) {
        const taskJsonPath = `${taskPath}/task.json`.replace(/\\/g, "/");
        const buffer = await this.readFile(taskJsonPath);
        return JSON.parse(buffer.toString("utf-8"));
      }
      /**
       * Close the VSIX file and clean up resources
       */
      async close() {
        const zipFile = this.zipFile;
        this.zipFile = null;
        if (zipFile) {
          await new Promise((resolve) => {
            let settled = false;
            const complete = () => {
              if (!settled) {
                settled = true;
                resolve();
              }
            };
            const onClose = () => {
              zipFile.removeListener("error", onError);
              complete();
            };
            const onError = () => {
              zipFile.removeListener("close", onClose);
              complete();
            };
            zipFile.once("close", onClose);
            zipFile.once("error", onError);
            try {
              zipFile.close();
            } catch {
              zipFile.removeListener("close", onClose);
              zipFile.removeListener("error", onError);
              complete();
              return;
            }
            setTimeout(() => {
              zipFile.removeListener("close", onClose);
              zipFile.removeListener("error", onError);
              complete();
            }, 200);
          });
        }
        this.fileCache.clear();
        this.entriesCache = null;
      }
      /**
       * Get the path to the VSIX file
       */
      getPath() {
        return this.vsixPath;
      }
    };
  }
});

// packages/core/dist/filesystem-manifest-reader.js
var filesystem_manifest_reader_exports = {};
__export(filesystem_manifest_reader_exports, {
  FilesystemManifestReader: () => FilesystemManifestReader
});
import { readFile } from "fs/promises";
import path3 from "path";
var FilesystemManifestReader;
var init_filesystem_manifest_reader = __esm({
  "packages/core/dist/filesystem-manifest-reader.js"() {
    "use strict";
    init_manifest_reader();
    FilesystemManifestReader = class extends ManifestReader {
      rootFolder;
      manifestGlobs;
      platform;
      manifestPath = null;
      manifestPaths = null;
      extensionManifest = null;
      // Map of packagePath (task name) to actual source path
      packagePathMap = null;
      constructor(options) {
        super();
        this.rootFolder = options.rootFolder;
        this.manifestGlobs = options.manifestGlobs || ["vss-extension.json"];
        this.platform = options.platform;
      }
      /**
       * Find and resolve all extension manifest file paths
       */
      async resolveManifestPaths() {
        if (this.manifestPaths) {
          return this.manifestPaths;
        }
        const matches = await this.platform.findMatch(this.rootFolder, this.manifestGlobs);
        if (matches.length === 0) {
          const commonNames = ["vss-extension.json", "extension.vsomanifest"];
          for (const name of commonNames) {
            const candidate = path3.join(this.rootFolder, name);
            if (await this.platform.fileExists(candidate)) {
              this.manifestPaths = [candidate];
              this.manifestPath = candidate;
              return this.manifestPaths;
            }
          }
          throw new Error(`Extension manifest not found in ${this.rootFolder}. Tried patterns: ${this.manifestGlobs.join(", ")}`);
        }
        if (matches.length > 1) {
          this.platform.warning(`Multiple manifest files found: ${matches.join(", ")}. Using first match as primary.`);
        }
        this.manifestPaths = matches;
        this.manifestPath = matches[0];
        return this.manifestPaths;
      }
      /**
       * Find and resolve the extension manifest file path
       */
      async resolveManifestPath() {
        const paths = await this.resolveManifestPaths();
        return paths[0];
      }
      /**
       * Read the extension manifest from filesystem
       * @returns Parsed extension manifest
       */
      async readExtensionManifest() {
        if (this.extensionManifest) {
          return this.extensionManifest;
        }
        const manifestPath = await this.resolveManifestPath();
        const content = (await readFile(manifestPath)).toString("utf8");
        this.extensionManifest = JSON.parse(content);
        return this.extensionManifest;
      }
      /**
       * Build a map of packagePath to actual source path from files array
       * This handles cases where task.json is in a different directory than the final package path
       * @returns Map of packagePath to source path
       */
      async buildPackagePathMap() {
        if (this.packagePathMap) {
          return this.packagePathMap;
        }
        this.packagePathMap = /* @__PURE__ */ new Map();
        const manifest = await this.readExtensionManifest();
        if (manifest.files) {
          for (const file of manifest.files) {
            if (file.packagePath) {
              this.packagePathMap.set(file.packagePath, file.path);
              this.platform.debug(`Mapped packagePath '${file.packagePath}' to source path '${file.path}'`);
            }
          }
        }
        return this.packagePathMap;
      }
      /**
       * Find task paths from the extension manifest
       * @returns Array of task directory paths (relative to rootFolder)
       */
      async findTaskPaths() {
        const manifest = await this.readExtensionManifest();
        const taskPaths = [];
        if (manifest.contributions) {
          for (const contribution of manifest.contributions) {
            if (contribution.type === "ms.vss-distributed-task.task" && contribution.properties) {
              const name = contribution.properties.name;
              if (name) {
                taskPaths.push(name);
              }
            }
          }
        }
        if (taskPaths.length === 0 && manifest.files) {
          for (const file of manifest.files) {
            const taskJsonPath = path3.join(this.rootFolder, file.path, "task.json");
            if (await this.platform.fileExists(taskJsonPath)) {
              taskPaths.push(file.path);
            }
          }
        }
        return taskPaths;
      }
      /**
       * Read a task manifest from filesystem
       * @param taskPath Path to the task directory (relative to rootFolder) or packagePath
       * @returns Parsed task manifest
       */
      async readTaskManifest(taskPath) {
        const packagePathMap = await this.buildPackagePathMap();
        let actualPath = taskPath;
        const normalizedTaskPath = taskPath.replace(/\\/g, "/");
        for (const [pkgPath, sourcePath] of packagePathMap.entries()) {
          const normalizedPkgPath = pkgPath.replace(/\\/g, "/");
          if (normalizedTaskPath === normalizedPkgPath) {
            actualPath = sourcePath;
            break;
          } else if (normalizedTaskPath.startsWith(normalizedPkgPath + "/")) {
            const remainder = normalizedTaskPath.substring(normalizedPkgPath.length + 1);
            actualPath = path3.join(sourcePath, remainder);
            break;
          }
        }
        this.platform.debug(`Reading task manifest: taskPath='${taskPath}', actualPath='${actualPath}'`);
        const absoluteTaskPath = path3.isAbsolute(actualPath) ? actualPath : path3.join(this.rootFolder, actualPath);
        const taskJsonPath = path3.join(absoluteTaskPath, "task.json");
        if (!await this.platform.fileExists(taskJsonPath)) {
          throw new Error(`Task manifest not found: ${taskJsonPath}`);
        }
        const content = (await readFile(taskJsonPath)).toString("utf8");
        return JSON.parse(content);
      }
      /**
       * Close and clean up resources
       * No-op for filesystem reader as there are no persistent resources
       */
      async close() {
        this.extensionManifest = null;
        this.manifestPath = null;
        this.manifestPaths = null;
        this.packagePathMap = null;
      }
      /**
       * Read all extension manifests matched by manifest globs
       */
      async readAllExtensionManifests() {
        const paths = await this.resolveManifestPaths();
        const manifests = [];
        for (const manifestPath of paths) {
          const content = (await readFile(manifestPath)).toString("utf8");
          manifests.push({
            path: manifestPath,
            manifest: JSON.parse(content)
          });
        }
        return manifests;
      }
      /**
       * Get the root folder path
       */
      getRootFolder() {
        return this.rootFolder;
      }
      /**
       * Get the resolved manifest path (if already resolved)
       */
      getManifestPath() {
        return this.manifestPath;
      }
    };
  }
});

// packages/core/dist/vsix-writer.js
var vsix_writer_exports = {};
__export(vsix_writer_exports, {
  VsixWriter: () => VsixWriter
});
import { Buffer as Buffer3 } from "buffer";
import { createWriteStream } from "fs";
import yazl from "yazl";
function validateZipPath2(filePath) {
  const normalizedPath = filePath.replace(/\\/g, "/");
  if (normalizedPath.startsWith("/") || /^[A-Z]:/i.test(normalizedPath)) {
    throw new Error(`Security: Absolute paths are not allowed: ${filePath}`);
  }
  if (normalizedPath.includes("../") || normalizedPath.startsWith("..")) {
    throw new Error(`Security: Path traversal detected: ${filePath}`);
  }
  if (normalizedPath.includes("\0")) {
    throw new Error(`Security: Null byte detected in path: ${filePath}`);
  }
}
var VsixWriter;
var init_vsix_writer = __esm({
  "packages/core/dist/vsix-writer.js"() {
    "use strict";
    VsixWriter = class _VsixWriter {
      editor;
      zipFile = null;
      constructor(editor) {
        this.editor = editor;
      }
      /**
       * Create a writer from an editor
       * @param editor The ManifestEditor with modifications
       * @returns VsixWriter instance
       */
      static fromEditor(editor) {
        return new _VsixWriter(editor);
      }
      /**
       * Write the modified VSIX to a file
       *
       * This method efficiently copies unchanged entries from the source VSIX
       * without recompression, significantly improving performance for large files.
       *
       * @param outputPath Path where the new VSIX should be written
       * @returns Promise that resolves when writing is complete
       */
      async writeToFile(outputPath) {
        const reader = this.editor.getReader();
        const modifications = this.editor.getModifications();
        const manifestMods = this.editor.getManifestModifications();
        const taskManifestMods = this.editor.getTaskManifestModifications();
        this.zipFile = new yazl.ZipFile();
        const addedFiles = /* @__PURE__ */ new Set();
        const manifestPath = await this.determineManifestPath(reader);
        if (Object.keys(manifestMods).length > 0 || taskManifestMods.size > 0) {
          await this.applyManifestModifications(reader, manifestPath, manifestMods, taskManifestMods, addedFiles);
        }
        for (const [path10, mod] of modifications) {
          validateZipPath2(path10);
          if (mod.type === "remove") {
            addedFiles.add(path10);
          } else if (mod.type === "modify" && mod.content) {
            this.zipFile.addBuffer(mod.content, path10);
            addedFiles.add(path10);
          }
        }
        await this.copyUnchangedFiles(reader, addedFiles);
        await this.finalizeZip(outputPath);
      }
      /**
       * Write the modified VSIX to a buffer in memory
       * @returns Promise<Buffer> containing the complete VSIX
       */
      async writeToBuffer() {
        const reader = this.editor.getReader();
        const modifications = this.editor.getModifications();
        const manifestMods = this.editor.getManifestModifications();
        const taskManifestMods = this.editor.getTaskManifestModifications();
        this.zipFile = new yazl.ZipFile();
        const addedFiles = /* @__PURE__ */ new Set();
        const manifestPath = await this.determineManifestPath(reader);
        if (Object.keys(manifestMods).length > 0 || taskManifestMods.size > 0) {
          await this.applyManifestModifications(reader, manifestPath, manifestMods, taskManifestMods, addedFiles);
        }
        for (const [path10, mod] of modifications) {
          validateZipPath2(path10);
          if (mod.type === "remove") {
            addedFiles.add(path10);
          } else if (mod.type === "modify" && mod.content) {
            this.zipFile.addBuffer(mod.content, path10);
            addedFiles.add(path10);
          }
        }
        await this.copyUnchangedFiles(reader, addedFiles);
        return this.finalizeZipToBuffer();
      }
      /**
       * Determine which manifest file to use
       */
      async determineManifestPath(reader) {
        if (await reader.fileExists("extension.vsomanifest")) {
          return "extension.vsomanifest";
        }
        if (await reader.fileExists("vss-extension.json")) {
          return "vss-extension.json";
        }
        throw new Error("No extension manifest found in source VSIX");
      }
      /**
       * Apply modifications to manifests
       */
      async applyManifestModifications(reader, manifestPath, manifestMods, taskManifestMods, addedFiles) {
        const manifest = await reader.readExtensionManifest();
        Object.assign(manifest, manifestMods);
        const manifestJson = JSON.stringify(manifest, null, 2);
        this.zipFile.addBuffer(Buffer3.from(manifestJson, "utf-8"), manifestPath);
        addedFiles.add(manifestPath);
        if (taskManifestMods.size > 0) {
          const taskManifests = await reader.readTaskManifests();
          for (const taskManifest of taskManifests) {
            const mods = taskManifestMods.get(taskManifest.manifest.name);
            if (mods) {
              Object.assign(taskManifest.manifest, mods);
              const taskJson = JSON.stringify(taskManifest.manifest, null, 2);
              const taskPath = `${taskManifest.path}/task.json`;
              this.zipFile.addBuffer(Buffer3.from(taskJson, "utf-8"), taskPath);
              addedFiles.add(taskPath);
            }
          }
        }
      }
      /**
       * Copy unchanged files from source VSIX
       *
       * This is the key optimization: files are copied directly from the source
       * ZIP without decompression/recompression, preserving original compression.
       */
      async copyUnchangedFiles(reader, addedFiles) {
        const allFiles = await reader.listFiles();
        for (const file of allFiles) {
          if (!addedFiles.has(file.path)) {
            try {
              const content = await reader.readFile(file.path);
              this.zipFile.addBuffer(content, file.path);
            } catch (err) {
              console.warn(`Warning: Could not copy file ${file.path}: ${err.message}`);
            }
          }
        }
      }
      /**
       * Finalize ZIP and write to file
       */
      async finalizeZip(outputPath) {
        if (!this.zipFile) {
          throw new Error("ZIP file not initialized");
        }
        return new Promise((resolve, reject) => {
          const outputStream = createWriteStream(outputPath);
          outputStream.on("error", (err) => {
            reject(new Error(`Failed to write VSIX file: ${err.message}`));
          });
          outputStream.on("finish", () => {
            resolve();
          });
          this.zipFile.outputStream.pipe(outputStream).on("error", (err) => {
            reject(new Error(`Failed to write VSIX stream: ${err.message}`));
          });
          this.zipFile.end();
        });
      }
      /**
       * Finalize ZIP to buffer
       */
      async finalizeZipToBuffer() {
        if (!this.zipFile) {
          throw new Error("ZIP file not initialized");
        }
        return new Promise((resolve, reject) => {
          const chunks = [];
          this.zipFile.outputStream.on("data", (chunk) => {
            chunks.push(chunk);
          });
          this.zipFile.outputStream.on("end", () => {
            resolve(Buffer3.concat(chunks));
          });
          this.zipFile.outputStream.on("error", (err) => {
            reject(new Error(`Failed to create VSIX buffer: ${err.message}`));
          });
          this.zipFile.end();
        });
      }
      /**
       * Close and cleanup resources
       */
      async close() {
        this.zipFile = null;
      }
    };
  }
});

// packages/core/dist/filesystem-manifest-writer.js
var filesystem_manifest_writer_exports = {};
__export(filesystem_manifest_writer_exports, {
  FilesystemManifestWriter: () => FilesystemManifestWriter
});
import { mkdir, readFile as readFile2, readdir, writeFile } from "fs/promises";
import path4 from "path";
var FilesystemManifestWriter;
var init_filesystem_manifest_writer = __esm({
  "packages/core/dist/filesystem-manifest-writer.js"() {
    "use strict";
    FilesystemManifestWriter = class _FilesystemManifestWriter {
      editor;
      platform;
      overridesPath = null;
      constructor(editor, platform) {
        this.editor = editor;
        this.platform = platform;
      }
      /**
       * Create a writer from an editor
       * @param editor The editor with modifications
       * @returns FilesystemManifestWriter instance
       */
      static fromEditor(editor) {
        const reader = editor.getReader();
        if (reader.constructor.name !== "FilesystemManifestReader") {
          throw new Error("FilesystemManifestWriter can only be used with FilesystemManifestReader");
        }
        const fsReader = reader;
        const platform = fsReader.platform;
        return new _FilesystemManifestWriter(editor, platform);
      }
      /**
       * Write modified manifests to the filesystem
       *
       * This updates task.json files directly and writes extension manifest changes.
       * It also generates an overrides.json in the temp directory that can be passed
       * to tfx with --overrides-file.
       *
       * @returns Promise that resolves when writing is complete
       */
      async writeToFilesystem() {
        const reader = this.editor.getReader();
        const rootFolder = reader.getRootFolder();
        const manifestMods = this.editor.getManifestModifications();
        const taskManifestMods = this.editor.getTaskManifestModifications();
        const fileMods = this.editor.getModifications();
        this.platform.debug("Writing manifests to filesystem...");
        let synchronizedManifests = [];
        if (this.editor.shouldSynchronizeBinaryFileEntries()) {
          synchronizedManifests = await this.synchronizeBinaryFileEntries(reader, rootFolder);
        }
        if (taskManifestMods.size > 0) {
          await this.writeTaskManifests(reader, rootFolder, taskManifestMods);
        }
        if (Object.keys(manifestMods).length > 0 || synchronizedManifests.length > 0) {
          await this.writeSynchronizedManifests(reader, manifestMods, synchronizedManifests);
        }
        for (const [filePath, mod] of fileMods) {
          if (mod.type === "modify" && mod.content) {
            const absolutePath = path4.isAbsolute(filePath) ? filePath : path4.join(rootFolder, filePath);
            this.platform.debug(`Writing file: ${absolutePath}`);
            await writeFile(absolutePath, new Uint8Array(mod.content));
          }
        }
        await this.generateOverridesFile(manifestMods);
        this.platform.info("Manifests written to filesystem successfully");
      }
      /**
       * Write task manifest modifications to filesystem
       */
      async writeTaskManifests(reader, rootFolder, taskManifestMods) {
        const tasks = await reader.readTaskManifests();
        const appliedTaskNames = /* @__PURE__ */ new Set();
        const packagePathMap = await reader.buildPackagePathMap();
        for (const { path: taskPath, manifest } of tasks) {
          const mods = taskManifestMods.get(manifest.name);
          if (mods) {
            appliedTaskNames.add(manifest.name);
            Object.assign(manifest, mods);
            let actualPath = taskPath;
            const normalizedTaskPath = taskPath.replace(/\\/g, "/");
            for (const [pkgPath, sourcePath] of packagePathMap.entries()) {
              const normalizedPkgPath = pkgPath.replace(/\\/g, "/");
              if (normalizedTaskPath === normalizedPkgPath) {
                actualPath = sourcePath;
                break;
              } else if (normalizedTaskPath.startsWith(normalizedPkgPath + "/")) {
                const remainder = normalizedTaskPath.substring(normalizedPkgPath.length + 1);
                actualPath = path4.join(sourcePath, remainder);
                break;
              }
            }
            this.platform.debug(`Writing task manifest: taskPath='${taskPath}', actualPath='${actualPath}'`);
            const absoluteTaskPath = path4.isAbsolute(actualPath) ? actualPath : path4.join(rootFolder, actualPath);
            const taskJsonPath = path4.join(absoluteTaskPath, "task.json");
            this.platform.debug(`Writing to file: ${taskJsonPath}`);
            const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
            await writeFile(taskJsonPath, manifestJson, "utf-8");
          }
        }
        for (const [taskName, mods] of taskManifestMods.entries()) {
          if (appliedTaskNames.has(taskName)) {
            continue;
          }
          const fallbackTaskDir = await this.findTaskDirectoryByName(rootFolder, taskName);
          if (!fallbackTaskDir) {
            this.platform.debug(`No task.json found for task '${taskName}' during fallback write`);
            continue;
          }
          const taskJsonPath = path4.join(fallbackTaskDir, "task.json");
          const content = (await readFile2(taskJsonPath)).toString("utf8");
          const manifest = JSON.parse(content);
          Object.assign(manifest, mods);
          this.platform.debug(`Fallback writing task manifest: ${taskJsonPath}`);
          await writeFile(taskJsonPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
        }
      }
      /**
       * Recursively find a task directory by task manifest name
       */
      async findTaskDirectoryByName(rootFolder, taskName) {
        const stack = [rootFolder];
        while (stack.length > 0) {
          const current = stack.pop();
          let entries;
          try {
            entries = await readdir(current, { withFileTypes: true });
          } catch {
            continue;
          }
          for (const entry of entries) {
            const absolutePath = path4.join(current, entry.name);
            if (entry.isDirectory()) {
              stack.push(absolutePath);
              continue;
            }
            if (!entry.isFile() || entry.name !== "task.json") {
              continue;
            }
            try {
              const content = (await readFile2(absolutePath)).toString("utf8");
              const manifest = JSON.parse(content);
              if (manifest.name === taskName) {
                return path4.dirname(absolutePath);
              }
            } catch {
            }
          }
        }
        return null;
      }
      /**
       * Write extension manifest modifications to filesystem
       */
      async writeExtensionManifest(reader, manifestMods, baseManifest) {
        const manifest = baseManifest ?? await reader.readExtensionManifest();
        Object.assign(manifest, manifestMods);
        const manifestPath = reader.getManifestPath();
        if (!manifestPath) {
          throw new Error("Extension manifest path not resolved");
        }
        this.platform.debug(`Writing extension manifest: ${manifestPath}`);
        await this.writeManifestAtPath(manifestPath, manifest);
      }
      async writeSynchronizedManifests(reader, manifestMods, synchronizedManifests) {
        const primaryManifestPath = reader.getManifestPath();
        const synchronizedByPath = new Map(synchronizedManifests.map((item) => [item.manifestPath, item.manifest]));
        if (Object.keys(manifestMods).length > 0) {
          const primaryBaseManifest = primaryManifestPath ? synchronizedByPath.get(primaryManifestPath) : void 0;
          await this.writeExtensionManifest(reader, manifestMods, primaryBaseManifest);
          if (primaryManifestPath) {
            synchronizedByPath.delete(primaryManifestPath);
          }
        }
        for (const [manifestPath, manifest] of synchronizedByPath) {
          this.platform.debug(`Writing synchronized extension manifest: ${manifestPath}`);
          await this.writeManifestAtPath(manifestPath, manifest);
        }
      }
      async writeManifestAtPath(manifestPath, manifest) {
        const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
        await writeFile(manifestPath, manifestJson, "utf-8");
      }
      /**
       * Synchronize extension manifest file entries for extensionless files.
       *
       * Behavior ported from the legacy manifest-fix workflow:
       * 1) Remove all explicit application/octet-stream file entries
       * 2) Re-scan manifest-referenced directories
       * 3) Add extensionless files back as application/octet-stream
       *
       * packagePath mapping is preserved for added file entries.
       */
      async synchronizeBinaryFileEntries(reader, rootFolder) {
        const allManifests = await reader.readAllExtensionManifests();
        if (allManifests.length === 0) {
          this.platform.debug("No extension manifest files array found; skipping binary file sync");
          return [];
        }
        const changedManifests = [];
        let totalRemovedCount = 0;
        let totalAddedCount = 0;
        for (const { path: manifestPath, manifest } of allManifests) {
          const originalFiles = Array.isArray(manifest.files) ? manifest.files : [];
          if (originalFiles.length === 0) {
            continue;
          }
          const retainedFiles = originalFiles.filter((entry) => entry.contentType !== "application/octet-stream");
          const removedCount = originalFiles.length - retainedFiles.length;
          totalRemovedCount += removedCount;
          const scanRoots = await this.getManifestDirectoryScanRoots(rootFolder, retainedFiles);
          const existingKeys = /* @__PURE__ */ new Set();
          for (const entry of retainedFiles) {
            existingKeys.add(this.getManifestEntryKey(entry.path, entry.packagePath));
          }
          const addedEntries = [];
          for (const scanRoot of scanRoots) {
            const files = await this.collectFilesRecursive(scanRoot.absolutePath);
            for (const absoluteFilePath of files) {
              const fileName = path4.basename(absoluteFilePath);
              if (!this.isExtensionlessFileName(fileName)) {
                continue;
              }
              const relativeInsideRoot = this.toPosixPath(path4.relative(scanRoot.absolutePath, absoluteFilePath));
              const filePath = this.joinManifestPath(scanRoot.manifestPathPrefix, relativeInsideRoot);
              const packagePath = scanRoot.packagePathPrefix ? this.joinManifestPath(scanRoot.packagePathPrefix, relativeInsideRoot) : void 0;
              const key = this.getManifestEntryKey(filePath, packagePath);
              if (existingKeys.has(key)) {
                continue;
              }
              existingKeys.add(key);
              addedEntries.push({
                path: filePath,
                packagePath,
                contentType: "application/octet-stream"
              });
            }
          }
          totalAddedCount += addedEntries.length;
          if (removedCount > 0 || addedEntries.length > 0) {
            manifest.files = [...retainedFiles, ...addedEntries];
            changedManifests.push({ manifestPath, manifest });
          }
        }
        if (changedManifests.length === 0) {
          this.platform.debug("Binary file sync: no changes required");
          return [];
        }
        this.platform.info(`Synchronized binary file entries in extension manifests (removed ${totalRemovedCount}, added ${totalAddedCount})`);
        return changedManifests;
      }
      async getManifestDirectoryScanRoots(rootFolder, fileEntries) {
        const roots = [];
        for (const entry of fileEntries) {
          if (!entry.path) {
            continue;
          }
          const absolutePath = path4.isAbsolute(entry.path) ? entry.path : path4.join(rootFolder, entry.path.replace(/\//g, path4.sep));
          let stats;
          try {
            stats = await readdir(absolutePath, { withFileTypes: true });
          } catch {
            continue;
          }
          if (Array.isArray(stats)) {
            roots.push({
              absolutePath,
              manifestPathPrefix: this.toPosixPath(entry.path),
              packagePathPrefix: entry.packagePath ? this.toPosixPath(entry.packagePath) : void 0
            });
          }
        }
        return roots;
      }
      async collectFilesRecursive(directory) {
        const files = [];
        const entries = await readdir(directory, { withFileTypes: true });
        for (const entry of entries) {
          const absolutePath = path4.join(directory, entry.name);
          if (entry.isDirectory()) {
            const nestedFiles = await this.collectFilesRecursive(absolutePath);
            files.push(...nestedFiles);
          } else if (entry.isFile()) {
            files.push(absolutePath);
          }
        }
        return files;
      }
      isExtensionlessFileName(fileName) {
        return !/\.[^.]+$/.test(fileName) || fileName.endsWith(".");
      }
      toPosixPath(inputPath) {
        return inputPath.replace(/\\/g, "/").replace(/^\.\//, "");
      }
      joinManifestPath(basePath, relativePath) {
        const normalizedBase = this.toPosixPath(basePath).replace(/\/$/, "");
        const normalizedRelative = this.toPosixPath(relativePath).replace(/^\//, "");
        if (!normalizedRelative) {
          return normalizedBase;
        }
        return `${normalizedBase}/${normalizedRelative}`;
      }
      getManifestEntryKey(filePath, packagePath) {
        const normalizedPath = this.toPosixPath(filePath);
        const normalizedPackagePath = packagePath ? this.toPosixPath(packagePath) : "";
        return `${normalizedPath}::${normalizedPackagePath}`;
      }
      /**
       * Generate overrides.json file in temp directory
       *
       * This file can be passed to tfx with --overrides-file to override
       * extension manifest values during packaging without modifying source files.
       */
      async generateOverridesFile(manifestMods) {
        if (Object.keys(manifestMods).length === 0) {
          this.platform.debug("No manifest modifications, skipping overrides.json generation");
          return;
        }
        const overrides = {};
        if (manifestMods.publisher) {
          overrides.publisher = manifestMods.publisher;
        }
        if (manifestMods.id) {
          overrides.id = manifestMods.id;
        }
        if (manifestMods.version) {
          overrides.version = manifestMods.version;
        }
        if (manifestMods.name) {
          overrides.name = manifestMods.name;
        }
        if (manifestMods.description) {
          overrides.description = manifestMods.description;
        }
        if (manifestMods.galleryFlags) {
          overrides.galleryFlags = manifestMods.galleryFlags;
        }
        const tempDir = this.platform.getTempDir();
        await mkdir(tempDir, { recursive: true });
        this.overridesPath = path4.join(tempDir, `overrides-${Date.now()}.json`);
        this.platform.debug(`Writing overrides file: ${this.overridesPath}`);
        const overridesJson = JSON.stringify(overrides, null, 2) + "\n";
        await writeFile(this.overridesPath, overridesJson, "utf-8");
        this.platform.info(`Generated overrides file: ${this.overridesPath}`);
      }
      /**
       * Get the path to the generated overrides.json file
       * This can be passed to tfx with --overrides-file
       * @returns Path to overrides.json or null if not generated
       */
      getOverridesPath() {
        return this.overridesPath;
      }
      /**
       * Close and cleanup resources
       */
      async close() {
      }
    };
  }
});

// packages/core/dist/manifest-editor.js
var manifest_editor_exports = {};
__export(manifest_editor_exports, {
  ManifestEditor: () => ManifestEditor
});
import { Buffer as Buffer4 } from "buffer";
var ManifestEditor;
var init_manifest_editor = __esm({
  "packages/core/dist/manifest-editor.js"() {
    "use strict";
    init_dist_node();
    ManifestEditor = class _ManifestEditor {
      reader;
      modifications = /* @__PURE__ */ new Map();
      manifestModifications = {};
      taskManifestModifications = /* @__PURE__ */ new Map();
      synchronizeBinaryFileEntries = false;
      // Track original task IDs for updating extension manifest references
      taskIdUpdates = /* @__PURE__ */ new Map();
      constructor(options) {
        this.reader = options.reader;
      }
      /**
       * Create an editor from a reader
       * @param reader The manifest reader (VSIX or filesystem)
       * @returns ManifestEditor instance
       */
      static fromReader(reader) {
        return new _ManifestEditor({ reader });
      }
      /**
       * Apply a set of options to the manifest
       * This is the main entry point for batch modifications
       * All conditional logic for applying changes is contained here
       *
       * @param options Options to apply
       * @returns Promise<this> for async chaining
       */
      async applyOptions(options) {
        if (options.publisherId) {
          this.setPublisher(options.publisherId);
        }
        if (options.extensionId) {
          this.setExtensionId(options.extensionId);
        }
        if (options.extensionVersion) {
          this.setVersion(options.extensionVersion);
        }
        if (options.extensionName) {
          this.setName(options.extensionName);
        }
        if (options.extensionVisibility) {
          this.setVisibility(options.extensionVisibility);
        }
        if (options.extensionPricing) {
          this.setPricing(options.extensionPricing);
        }
        if (options.updateTasksVersion && options.extensionVersion) {
          const versionType = options.updateTasksVersionType || "major";
          await this.updateAllTaskVersions(options.extensionVersion, versionType);
        }
        if (options.updateTasksId) {
          await this.updateAllTaskIds();
        }
        if (options.synchronizeBinaryFileEntries) {
          this.synchronizeBinaryFileEntries = true;
        }
        return this;
      }
      /**
       * Set the publisher ID
       * @param publisher New publisher ID
       * @returns This editor for chaining
       */
      setPublisher(publisher) {
        this.manifestModifications.publisher = publisher;
        return this;
      }
      /**
       * Set the extension ID
       * @param id New extension ID
       * @returns This editor for chaining
       */
      setExtensionId(id) {
        this.manifestModifications.id = id;
        return this;
      }
      /**
       * Set the extension version
       * @param version New version (e.g., "1.2.3")
       * @returns This editor for chaining
       */
      setVersion(version) {
        this.manifestModifications.version = version;
        return this;
      }
      /**
       * Set the extension name
       * @param name New display name
       * @returns This editor for chaining
       */
      setName(name) {
        this.manifestModifications.name = name;
        return this;
      }
      /**
       * Set the extension description
       * @param description New description
       * @returns This editor for chaining
       */
      setDescription(description) {
        this.manifestModifications.description = description;
        return this;
      }
      /**
       * Set extension visibility in gallery
       * @param visibility 'public', 'private', 'public_preview', or 'private_preview'
       * @returns This editor for chaining
       */
      setVisibility(visibility) {
        if (!this.manifestModifications.galleryFlags) {
          this.manifestModifications.galleryFlags = [];
        }
        const flags = this.manifestModifications.galleryFlags;
        const visibilityFlags = ["Public", "Private", "Preview"];
        for (const flag of visibilityFlags) {
          const index = flags.indexOf(flag);
          if (index >= 0) {
            flags.splice(index, 1);
          }
        }
        if (visibility === "public") {
          flags.push("Public");
        } else if (visibility === "private") {
          flags.push("Private");
        } else if (visibility === "public_preview") {
          flags.push("Public", "Preview");
        } else if (visibility === "private_preview") {
          flags.push("Private", "Preview");
        }
        return this;
      }
      /**
       * Set extension pricing model
       * @param pricing 'free', 'paid', or 'trial'
       * @returns This editor for chaining
       */
      setPricing(pricing) {
        if (!this.manifestModifications.galleryFlags) {
          this.manifestModifications.galleryFlags = [];
        }
        const flags = this.manifestModifications.galleryFlags;
        const pricingFlags = ["Free", "Paid", "Trial"];
        for (const flag of pricingFlags) {
          const index = flags.indexOf(flag);
          if (index >= 0) {
            flags.splice(index, 1);
          }
        }
        const flagMap = { free: "Free", paid: "Paid", trial: "Trial" };
        flags.push(flagMap[pricing]);
        return this;
      }
      /**
       * Update a specific task's version
       * @param taskName Name of the task
       * @param extensionVersion Extension version to apply (e.g., "1.2.3")
       * @param versionType How to apply the version: 'major', 'minor', or 'patch'
       * @returns This editor for chaining
       */
      updateTaskVersion(taskName, extensionVersion, versionType = "major") {
        const versionParts = extensionVersion.split(".");
        if (versionParts.length > 3) {
        }
        const newVersion = {
          major: parseInt(versionParts[0], 10) || 0,
          minor: parseInt(versionParts[1], 10) || 0,
          patch: parseInt(versionParts[2], 10) || 0
        };
        if (!this.taskManifestModifications.has(taskName)) {
          this.taskManifestModifications.set(taskName, {});
        }
        const taskMods = this.taskManifestModifications.get(taskName);
        const existingVersion = taskMods.version || { Major: 0, Minor: 0, Patch: 0 };
        switch (versionType) {
          case "major":
            taskMods.version = {
              Major: newVersion.major,
              Minor: newVersion.minor,
              Patch: newVersion.patch
            };
            break;
          case "minor":
            taskMods.version = {
              Major: existingVersion.Major,
              Minor: newVersion.minor,
              Patch: newVersion.patch
            };
            break;
          case "patch":
            taskMods.version = {
              Major: existingVersion.Major,
              Minor: existingVersion.Minor,
              Patch: newVersion.patch
            };
            break;
        }
        return this;
      }
      /**
       * Update a specific task's ID (UUID) using v5 namespacing
       * @param taskName Name of the task
       * @param publisherId Publisher ID (for UUID generation)
       * @param extensionId Extension ID (for UUID generation)
       * @returns This editor for chaining
       */
      updateTaskId(taskName, publisherId, extensionId) {
        const marketplaceNamespace = v5_default("https://marketplace.visualstudio.com/vsts", v5_default.URL);
        const taskNamespace = `${publisherId}.${extensionId}.${taskName}`;
        const newId = v5_default(taskNamespace, marketplaceNamespace);
        if (!this.taskManifestModifications.has(taskName)) {
          this.taskManifestModifications.set(taskName, {});
        }
        const taskMods = this.taskManifestModifications.get(taskName);
        taskMods.id = newId;
        return this;
      }
      /**
       * Update all tasks' versions in the extension
       * Reads all tasks from the reader and updates their versions
       * @param extensionVersion Extension version to apply
       * @param versionType How to apply the version: 'major', 'minor', or 'patch'
       * @returns Promise<this> for async chaining
       */
      async updateAllTaskVersions(extensionVersion, versionType = "major") {
        const tasks = await this.reader.getTasksInfo();
        const versionParts = extensionVersion.split(".");
        const parsedVersion = {
          major: parseInt(versionParts[0], 10) || 0,
          minor: parseInt(versionParts[1], 10) || 0,
          patch: parseInt(versionParts[2], 10) || 0
        };
        for (const task of tasks) {
          const existingParts = (task.version || "0.0.0").split(".");
          const existingVersion = {
            Major: parseInt(existingParts[0], 10) || 0,
            Minor: parseInt(existingParts[1], 10) || 0,
            Patch: parseInt(existingParts[2], 10) || 0
          };
          if (!this.taskManifestModifications.has(task.name)) {
            this.taskManifestModifications.set(task.name, {});
          }
          const taskMods = this.taskManifestModifications.get(task.name);
          switch (versionType) {
            case "major":
              taskMods.version = {
                Major: parsedVersion.major,
                Minor: parsedVersion.minor,
                Patch: parsedVersion.patch
              };
              break;
            case "minor":
              taskMods.version = {
                Major: existingVersion.Major,
                Minor: parsedVersion.minor,
                Patch: parsedVersion.patch
              };
              break;
            case "patch":
              taskMods.version = {
                Major: existingVersion.Major,
                Minor: existingVersion.Minor,
                Patch: parsedVersion.patch
              };
              break;
          }
        }
        return this;
      }
      /**
       * Update all tasks' IDs in the extension using v5 namespacing
       * Reads extension manifest for publisher/ID and all tasks from reader
       * @returns Promise<this> for async chaining
       */
      async updateAllTaskIds() {
        const manifest = await this.reader.readExtensionManifest();
        const publisherId = this.manifestModifications.publisher || manifest.publisher;
        const extensionId = this.manifestModifications.id || manifest.id;
        const tasks = await this.reader.getTasksInfo();
        for (const task of tasks) {
          this.updateTaskId(task.name, publisherId, extensionId);
        }
        return this;
      }
      /**
       * Add or modify a file
       * @param path Path to the file
       * @param content File content
       * @returns This editor for chaining
       */
      setFile(path10, content) {
        const buffer = Buffer4.isBuffer(content) ? content : Buffer4.from(content, "utf-8");
        const normalizedPath = path10.replace(/\\/g, "/");
        this.modifications.set(normalizedPath, {
          type: "modify",
          path: normalizedPath,
          content: buffer
        });
        return this;
      }
      /**
       * Remove a file
       * @param path Path to the file
       * @returns This editor for chaining
       */
      removeFile(path10) {
        const normalizedPath = path10.replace(/\\/g, "/");
        this.modifications.set(normalizedPath, {
          type: "remove",
          path: normalizedPath
        });
        return this;
      }
      /**
       * Convert to a writer for output
       * The writer type depends on the reader type
       * @returns Promise<Writer> ready to write (VsixWriter or FilesystemManifestWriter)
       */
      async toWriter() {
        const readerConstructorName = this.reader.constructor.name;
        const { VsixReader: VsixReader2 } = await Promise.resolve().then(() => (init_vsix_reader(), vsix_reader_exports));
        const { FilesystemManifestReader: FilesystemManifestReader2 } = await Promise.resolve().then(() => (init_filesystem_manifest_reader(), filesystem_manifest_reader_exports));
        if (this.reader instanceof VsixReader2 || readerConstructorName === "VsixReader") {
          const { VsixWriter: VsixWriter2 } = await Promise.resolve().then(() => (init_vsix_writer(), vsix_writer_exports));
          return VsixWriter2.fromEditor(this);
        }
        if (this.reader instanceof FilesystemManifestReader2 || readerConstructorName === "FilesystemManifestReader") {
          const { FilesystemManifestWriter: FilesystemManifestWriter2 } = await Promise.resolve().then(() => (init_filesystem_manifest_writer(), filesystem_manifest_writer_exports));
          return FilesystemManifestWriter2.fromEditor(this);
        }
        throw new Error(`Unsupported reader type: ${readerConstructorName}`);
      }
      /**
       * Get the source reader
       * @internal
       */
      getReader() {
        return this.reader;
      }
      /**
       * Get all file modifications
       * @internal
       */
      getModifications() {
        return this.modifications;
      }
      /**
       * Get manifest modifications
       * @internal
       */
      getManifestModifications() {
        return this.manifestModifications;
      }
      /**
       * Get task manifest modifications
       * @internal
       */
      getTaskManifestModifications() {
        return this.taskManifestModifications;
      }
      /**
       * Get task ID updates (for updating extension manifest references)
       * @internal
       */
      getTaskIdUpdates() {
        return this.taskIdUpdates;
      }
      /**
       * Indicates whether filesystem writer should synchronize extension binary file entries
       * @internal
       */
      shouldSynchronizeBinaryFileEntries() {
        return this.synchronizeBinaryFileEntries;
      }
    };
  }
});

// node_modules/concat-map/index.js
var require_concat_map = __commonJS({
  "node_modules/concat-map/index.js"(exports, module) {
    module.exports = function(xs, fn) {
      var res = [];
      for (var i = 0; i < xs.length; i++) {
        var x = fn(xs[i], i);
        if (isArray(x)) res.push.apply(res, x);
        else res.push(x);
      }
      return res;
    };
    var isArray = Array.isArray || function(xs) {
      return Object.prototype.toString.call(xs) === "[object Array]";
    };
  }
});

// node_modules/balanced-match/index.js
var require_balanced_match = __commonJS({
  "node_modules/balanced-match/index.js"(exports, module) {
    "use strict";
    module.exports = balanced;
    function balanced(a, b, str) {
      if (a instanceof RegExp) a = maybeMatch(a, str);
      if (b instanceof RegExp) b = maybeMatch(b, str);
      var r = range(a, b, str);
      return r && {
        start: r[0],
        end: r[1],
        pre: str.slice(0, r[0]),
        body: str.slice(r[0] + a.length, r[1]),
        post: str.slice(r[1] + b.length)
      };
    }
    function maybeMatch(reg, str) {
      var m = str.match(reg);
      return m ? m[0] : null;
    }
    balanced.range = range;
    function range(a, b, str) {
      var begs, beg, left, right, result;
      var ai = str.indexOf(a);
      var bi = str.indexOf(b, ai + 1);
      var i = ai;
      if (ai >= 0 && bi > 0) {
        if (a === b) {
          return [ai, bi];
        }
        begs = [];
        left = str.length;
        while (i >= 0 && !result) {
          if (i == ai) {
            begs.push(i);
            ai = str.indexOf(a, i + 1);
          } else if (begs.length == 1) {
            result = [begs.pop(), bi];
          } else {
            beg = begs.pop();
            if (beg < left) {
              left = beg;
              right = bi;
            }
            bi = str.indexOf(b, i + 1);
          }
          i = ai < bi && ai >= 0 ? ai : bi;
        }
        if (begs.length) {
          result = [left, right];
        }
      }
      return result;
    }
  }
});

// node_modules/brace-expansion/index.js
var require_brace_expansion = __commonJS({
  "node_modules/brace-expansion/index.js"(exports, module) {
    var concatMap = require_concat_map();
    var balanced = require_balanced_match();
    module.exports = expandTop;
    var escSlash = "\0SLASH" + Math.random() + "\0";
    var escOpen = "\0OPEN" + Math.random() + "\0";
    var escClose = "\0CLOSE" + Math.random() + "\0";
    var escComma = "\0COMMA" + Math.random() + "\0";
    var escPeriod = "\0PERIOD" + Math.random() + "\0";
    function numeric(str) {
      return parseInt(str, 10) == str ? parseInt(str, 10) : str.charCodeAt(0);
    }
    function escapeBraces(str) {
      return str.split("\\\\").join(escSlash).split("\\{").join(escOpen).split("\\}").join(escClose).split("\\,").join(escComma).split("\\.").join(escPeriod);
    }
    function unescapeBraces(str) {
      return str.split(escSlash).join("\\").split(escOpen).join("{").split(escClose).join("}").split(escComma).join(",").split(escPeriod).join(".");
    }
    function parseCommaParts(str) {
      if (!str)
        return [""];
      var parts = [];
      var m = balanced("{", "}", str);
      if (!m)
        return str.split(",");
      var pre = m.pre;
      var body = m.body;
      var post = m.post;
      var p = pre.split(",");
      p[p.length - 1] += "{" + body + "}";
      var postParts = parseCommaParts(post);
      if (post.length) {
        p[p.length - 1] += postParts.shift();
        p.push.apply(p, postParts);
      }
      parts.push.apply(parts, p);
      return parts;
    }
    function expandTop(str) {
      if (!str)
        return [];
      if (str.substr(0, 2) === "{}") {
        str = "\\{\\}" + str.substr(2);
      }
      return expand(escapeBraces(str), true).map(unescapeBraces);
    }
    function embrace(str) {
      return "{" + str + "}";
    }
    function isPadded(el) {
      return /^-?0\d/.test(el);
    }
    function lte(i, y) {
      return i <= y;
    }
    function gte(i, y) {
      return i >= y;
    }
    function expand(str, isTop) {
      var expansions = [];
      var m = balanced("{", "}", str);
      if (!m || /\$$/.test(m.pre)) return [str];
      var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
      var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
      var isSequence = isNumericSequence || isAlphaSequence;
      var isOptions = m.body.indexOf(",") >= 0;
      if (!isSequence && !isOptions) {
        if (m.post.match(/,(?!,).*\}/)) {
          str = m.pre + "{" + m.body + escClose + m.post;
          return expand(str);
        }
        return [str];
      }
      var n;
      if (isSequence) {
        n = m.body.split(/\.\./);
      } else {
        n = parseCommaParts(m.body);
        if (n.length === 1) {
          n = expand(n[0], false).map(embrace);
          if (n.length === 1) {
            var post = m.post.length ? expand(m.post, false) : [""];
            return post.map(function(p) {
              return m.pre + n[0] + p;
            });
          }
        }
      }
      var pre = m.pre;
      var post = m.post.length ? expand(m.post, false) : [""];
      var N;
      if (isSequence) {
        var x = numeric(n[0]);
        var y = numeric(n[1]);
        var width = Math.max(n[0].length, n[1].length);
        var incr = n.length == 3 ? Math.abs(numeric(n[2])) : 1;
        var test = lte;
        var reverse = y < x;
        if (reverse) {
          incr *= -1;
          test = gte;
        }
        var pad = n.some(isPadded);
        N = [];
        for (var i = x; test(i, y); i += incr) {
          var c;
          if (isAlphaSequence) {
            c = String.fromCharCode(i);
            if (c === "\\")
              c = "";
          } else {
            c = String(i);
            if (pad) {
              var need = width - c.length;
              if (need > 0) {
                var z = new Array(need + 1).join("0");
                if (i < 0)
                  c = "-" + z + c.slice(1);
                else
                  c = z + c;
              }
            }
          }
          N.push(c);
        }
      } else {
        N = concatMap(n, function(el) {
          return expand(el, false);
        });
      }
      for (var j = 0; j < N.length; j++) {
        for (var k = 0; k < post.length; k++) {
          var expansion = pre + N[j] + post[k];
          if (!isTop || isSequence || expansion)
            expansions.push(expansion);
        }
      }
      return expansions;
    }
  }
});

// node_modules/minimatch/minimatch.js
var require_minimatch = __commonJS({
  "node_modules/minimatch/minimatch.js"(exports, module) {
    module.exports = minimatch2;
    minimatch2.Minimatch = Minimatch2;
    var path10 = (function() {
      try {
        return __require("path");
      } catch (e) {
      }
    })() || {
      sep: "/"
    };
    minimatch2.sep = path10.sep;
    var GLOBSTAR = minimatch2.GLOBSTAR = Minimatch2.GLOBSTAR = {};
    var expand = require_brace_expansion();
    var plTypes = {
      "!": { open: "(?:(?!(?:", close: "))[^/]*?)" },
      "?": { open: "(?:", close: ")?" },
      "+": { open: "(?:", close: ")+" },
      "*": { open: "(?:", close: ")*" },
      "@": { open: "(?:", close: ")" }
    };
    var qmark = "[^/]";
    var star = qmark + "*?";
    var twoStarDot = "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?";
    var twoStarNoDot = "(?:(?!(?:\\/|^)\\.).)*?";
    var reSpecials = charSet("().*{}+?[]^$\\!");
    function charSet(s) {
      return s.split("").reduce(function(set, c) {
        set[c] = true;
        return set;
      }, {});
    }
    var slashSplit = /\/+/;
    minimatch2.filter = filter;
    function filter(pattern, options) {
      options = options || {};
      return function(p, i, list) {
        return minimatch2(p, pattern, options);
      };
    }
    function ext(a, b) {
      b = b || {};
      var t = {};
      Object.keys(a).forEach(function(k) {
        t[k] = a[k];
      });
      Object.keys(b).forEach(function(k) {
        t[k] = b[k];
      });
      return t;
    }
    minimatch2.defaults = function(def) {
      if (!def || typeof def !== "object" || !Object.keys(def).length) {
        return minimatch2;
      }
      var orig = minimatch2;
      var m = function minimatch3(p, pattern, options) {
        return orig(p, pattern, ext(def, options));
      };
      m.Minimatch = function Minimatch3(pattern, options) {
        return new orig.Minimatch(pattern, ext(def, options));
      };
      m.Minimatch.defaults = function defaults(options) {
        return orig.defaults(ext(def, options)).Minimatch;
      };
      m.filter = function filter2(pattern, options) {
        return orig.filter(pattern, ext(def, options));
      };
      m.defaults = function defaults(options) {
        return orig.defaults(ext(def, options));
      };
      m.makeRe = function makeRe2(pattern, options) {
        return orig.makeRe(pattern, ext(def, options));
      };
      m.braceExpand = function braceExpand2(pattern, options) {
        return orig.braceExpand(pattern, ext(def, options));
      };
      m.match = function(list, pattern, options) {
        return orig.match(list, pattern, ext(def, options));
      };
      return m;
    };
    Minimatch2.defaults = function(def) {
      return minimatch2.defaults(def).Minimatch;
    };
    function minimatch2(p, pattern, options) {
      assertValidPattern(pattern);
      if (!options) options = {};
      if (!options.nocomment && pattern.charAt(0) === "#") {
        return false;
      }
      return new Minimatch2(pattern, options).match(p);
    }
    function Minimatch2(pattern, options) {
      if (!(this instanceof Minimatch2)) {
        return new Minimatch2(pattern, options);
      }
      assertValidPattern(pattern);
      if (!options) options = {};
      pattern = pattern.trim();
      if (!options.allowWindowsEscape && path10.sep !== "/") {
        pattern = pattern.split(path10.sep).join("/");
      }
      this.options = options;
      this.set = [];
      this.pattern = pattern;
      this.regexp = null;
      this.negate = false;
      this.comment = false;
      this.empty = false;
      this.partial = !!options.partial;
      this.make();
    }
    Minimatch2.prototype.debug = function() {
    };
    Minimatch2.prototype.make = make;
    function make() {
      var pattern = this.pattern;
      var options = this.options;
      if (!options.nocomment && pattern.charAt(0) === "#") {
        this.comment = true;
        return;
      }
      if (!pattern) {
        this.empty = true;
        return;
      }
      this.parseNegate();
      var set = this.globSet = this.braceExpand();
      if (options.debug) this.debug = function debug5() {
        console.error.apply(console, arguments);
      };
      this.debug(this.pattern, set);
      set = this.globParts = set.map(function(s) {
        return s.split(slashSplit);
      });
      this.debug(this.pattern, set);
      set = set.map(function(s, si, set2) {
        return s.map(this.parse, this);
      }, this);
      this.debug(this.pattern, set);
      set = set.filter(function(s) {
        return s.indexOf(false) === -1;
      });
      this.debug(this.pattern, set);
      this.set = set;
    }
    Minimatch2.prototype.parseNegate = parseNegate;
    function parseNegate() {
      var pattern = this.pattern;
      var negate = false;
      var options = this.options;
      var negateOffset = 0;
      if (options.nonegate) return;
      for (var i = 0, l = pattern.length; i < l && pattern.charAt(i) === "!"; i++) {
        negate = !negate;
        negateOffset++;
      }
      if (negateOffset) this.pattern = pattern.substr(negateOffset);
      this.negate = negate;
    }
    minimatch2.braceExpand = function(pattern, options) {
      return braceExpand(pattern, options);
    };
    Minimatch2.prototype.braceExpand = braceExpand;
    function braceExpand(pattern, options) {
      if (!options) {
        if (this instanceof Minimatch2) {
          options = this.options;
        } else {
          options = {};
        }
      }
      pattern = typeof pattern === "undefined" ? this.pattern : pattern;
      assertValidPattern(pattern);
      if (options.nobrace || !/\{(?:(?!\{).)*\}/.test(pattern)) {
        return [pattern];
      }
      return expand(pattern);
    }
    var MAX_PATTERN_LENGTH = 1024 * 64;
    var assertValidPattern = function(pattern) {
      if (typeof pattern !== "string") {
        throw new TypeError("invalid pattern");
      }
      if (pattern.length > MAX_PATTERN_LENGTH) {
        throw new TypeError("pattern is too long");
      }
    };
    Minimatch2.prototype.parse = parse2;
    var SUBPARSE = {};
    function parse2(pattern, isSub) {
      assertValidPattern(pattern);
      var options = this.options;
      if (pattern === "**") {
        if (!options.noglobstar)
          return GLOBSTAR;
        else
          pattern = "*";
      }
      if (pattern === "") return "";
      var re = "";
      var hasMagic = !!options.nocase;
      var escaping = false;
      var patternListStack = [];
      var negativeLists = [];
      var stateChar;
      var inClass = false;
      var reClassStart = -1;
      var classStart = -1;
      var patternStart = pattern.charAt(0) === "." ? "" : options.dot ? "(?!(?:^|\\/)\\.{1,2}(?:$|\\/))" : "(?!\\.)";
      var self = this;
      function clearStateChar() {
        if (stateChar) {
          switch (stateChar) {
            case "*":
              re += star;
              hasMagic = true;
              break;
            case "?":
              re += qmark;
              hasMagic = true;
              break;
            default:
              re += "\\" + stateChar;
              break;
          }
          self.debug("clearStateChar %j %j", stateChar, re);
          stateChar = false;
        }
      }
      for (var i = 0, len = pattern.length, c; i < len && (c = pattern.charAt(i)); i++) {
        this.debug("%s	%s %s %j", pattern, i, re, c);
        if (escaping && reSpecials[c]) {
          re += "\\" + c;
          escaping = false;
          continue;
        }
        switch (c) {
          /* istanbul ignore next */
          case "/": {
            return false;
          }
          case "\\":
            clearStateChar();
            escaping = true;
            continue;
          // the various stateChar values
          // for the "extglob" stuff.
          case "?":
          case "*":
          case "+":
          case "@":
          case "!":
            this.debug("%s	%s %s %j <-- stateChar", pattern, i, re, c);
            if (inClass) {
              this.debug("  in class");
              if (c === "!" && i === classStart + 1) c = "^";
              re += c;
              continue;
            }
            self.debug("call clearStateChar %j", stateChar);
            clearStateChar();
            stateChar = c;
            if (options.noext) clearStateChar();
            continue;
          case "(":
            if (inClass) {
              re += "(";
              continue;
            }
            if (!stateChar) {
              re += "\\(";
              continue;
            }
            patternListStack.push({
              type: stateChar,
              start: i - 1,
              reStart: re.length,
              open: plTypes[stateChar].open,
              close: plTypes[stateChar].close
            });
            re += stateChar === "!" ? "(?:(?!(?:" : "(?:";
            this.debug("plType %j %j", stateChar, re);
            stateChar = false;
            continue;
          case ")":
            if (inClass || !patternListStack.length) {
              re += "\\)";
              continue;
            }
            clearStateChar();
            hasMagic = true;
            var pl = patternListStack.pop();
            re += pl.close;
            if (pl.type === "!") {
              negativeLists.push(pl);
            }
            pl.reEnd = re.length;
            continue;
          case "|":
            if (inClass || !patternListStack.length || escaping) {
              re += "\\|";
              escaping = false;
              continue;
            }
            clearStateChar();
            re += "|";
            continue;
          // these are mostly the same in regexp and glob
          case "[":
            clearStateChar();
            if (inClass) {
              re += "\\" + c;
              continue;
            }
            inClass = true;
            classStart = i;
            reClassStart = re.length;
            re += c;
            continue;
          case "]":
            if (i === classStart + 1 || !inClass) {
              re += "\\" + c;
              escaping = false;
              continue;
            }
            var cs = pattern.substring(classStart + 1, i);
            try {
              RegExp("[" + cs + "]");
            } catch (er) {
              var sp = this.parse(cs, SUBPARSE);
              re = re.substr(0, reClassStart) + "\\[" + sp[0] + "\\]";
              hasMagic = hasMagic || sp[1];
              inClass = false;
              continue;
            }
            hasMagic = true;
            inClass = false;
            re += c;
            continue;
          default:
            clearStateChar();
            if (escaping) {
              escaping = false;
            } else if (reSpecials[c] && !(c === "^" && inClass)) {
              re += "\\";
            }
            re += c;
        }
      }
      if (inClass) {
        cs = pattern.substr(classStart + 1);
        sp = this.parse(cs, SUBPARSE);
        re = re.substr(0, reClassStart) + "\\[" + sp[0];
        hasMagic = hasMagic || sp[1];
      }
      for (pl = patternListStack.pop(); pl; pl = patternListStack.pop()) {
        var tail = re.slice(pl.reStart + pl.open.length);
        this.debug("setting tail", re, pl);
        tail = tail.replace(/((?:\\{2}){0,64})(\\?)\|/g, function(_, $1, $2) {
          if (!$2) {
            $2 = "\\";
          }
          return $1 + $1 + $2 + "|";
        });
        this.debug("tail=%j\n   %s", tail, tail, pl, re);
        var t = pl.type === "*" ? star : pl.type === "?" ? qmark : "\\" + pl.type;
        hasMagic = true;
        re = re.slice(0, pl.reStart) + t + "\\(" + tail;
      }
      clearStateChar();
      if (escaping) {
        re += "\\\\";
      }
      var addPatternStart = false;
      switch (re.charAt(0)) {
        case "[":
        case ".":
        case "(":
          addPatternStart = true;
      }
      for (var n = negativeLists.length - 1; n > -1; n--) {
        var nl = negativeLists[n];
        var nlBefore = re.slice(0, nl.reStart);
        var nlFirst = re.slice(nl.reStart, nl.reEnd - 8);
        var nlLast = re.slice(nl.reEnd - 8, nl.reEnd);
        var nlAfter = re.slice(nl.reEnd);
        nlLast += nlAfter;
        var openParensBefore = nlBefore.split("(").length - 1;
        var cleanAfter = nlAfter;
        for (i = 0; i < openParensBefore; i++) {
          cleanAfter = cleanAfter.replace(/\)[+*?]?/, "");
        }
        nlAfter = cleanAfter;
        var dollar = "";
        if (nlAfter === "" && isSub !== SUBPARSE) {
          dollar = "$";
        }
        var newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast;
        re = newRe;
      }
      if (re !== "" && hasMagic) {
        re = "(?=.)" + re;
      }
      if (addPatternStart) {
        re = patternStart + re;
      }
      if (isSub === SUBPARSE) {
        return [re, hasMagic];
      }
      if (!hasMagic) {
        return globUnescape(pattern);
      }
      var flags = options.nocase ? "i" : "";
      try {
        var regExp = new RegExp("^" + re + "$", flags);
      } catch (er) {
        return new RegExp("$.");
      }
      regExp._glob = pattern;
      regExp._src = re;
      return regExp;
    }
    minimatch2.makeRe = function(pattern, options) {
      return new Minimatch2(pattern, options || {}).makeRe();
    };
    Minimatch2.prototype.makeRe = makeRe;
    function makeRe() {
      if (this.regexp || this.regexp === false) return this.regexp;
      var set = this.set;
      if (!set.length) {
        this.regexp = false;
        return this.regexp;
      }
      var options = this.options;
      var twoStar = options.noglobstar ? star : options.dot ? twoStarDot : twoStarNoDot;
      var flags = options.nocase ? "i" : "";
      var re = set.map(function(pattern) {
        return pattern.map(function(p) {
          return p === GLOBSTAR ? twoStar : typeof p === "string" ? regExpEscape(p) : p._src;
        }).join("\\/");
      }).join("|");
      re = "^(?:" + re + ")$";
      if (this.negate) re = "^(?!" + re + ").*$";
      try {
        this.regexp = new RegExp(re, flags);
      } catch (ex) {
        this.regexp = false;
      }
      return this.regexp;
    }
    minimatch2.match = function(list, pattern, options) {
      options = options || {};
      var mm = new Minimatch2(pattern, options);
      list = list.filter(function(f) {
        return mm.match(f);
      });
      if (mm.options.nonull && !list.length) {
        list.push(pattern);
      }
      return list;
    };
    Minimatch2.prototype.match = function match2(f, partial) {
      if (typeof partial === "undefined") partial = this.partial;
      this.debug("match", f, this.pattern);
      if (this.comment) return false;
      if (this.empty) return f === "";
      if (f === "/" && partial) return true;
      var options = this.options;
      if (path10.sep !== "/") {
        f = f.split(path10.sep).join("/");
      }
      f = f.split(slashSplit);
      this.debug(this.pattern, "split", f);
      var set = this.set;
      this.debug(this.pattern, "set", set);
      var filename;
      var i;
      for (i = f.length - 1; i >= 0; i--) {
        filename = f[i];
        if (filename) break;
      }
      for (i = 0; i < set.length; i++) {
        var pattern = set[i];
        var file = f;
        if (options.matchBase && pattern.length === 1) {
          file = [filename];
        }
        var hit = this.matchOne(file, pattern, partial);
        if (hit) {
          if (options.flipNegate) return true;
          return !this.negate;
        }
      }
      if (options.flipNegate) return false;
      return this.negate;
    };
    Minimatch2.prototype.matchOne = function(file, pattern, partial) {
      var options = this.options;
      this.debug(
        "matchOne",
        { "this": this, file, pattern }
      );
      this.debug("matchOne", file.length, pattern.length);
      for (var fi = 0, pi = 0, fl = file.length, pl = pattern.length; fi < fl && pi < pl; fi++, pi++) {
        this.debug("matchOne loop");
        var p = pattern[pi];
        var f = file[fi];
        this.debug(pattern, p, f);
        if (p === false) return false;
        if (p === GLOBSTAR) {
          this.debug("GLOBSTAR", [pattern, p, f]);
          var fr = fi;
          var pr = pi + 1;
          if (pr === pl) {
            this.debug("** at the end");
            for (; fi < fl; fi++) {
              if (file[fi] === "." || file[fi] === ".." || !options.dot && file[fi].charAt(0) === ".") return false;
            }
            return true;
          }
          while (fr < fl) {
            var swallowee = file[fr];
            this.debug("\nglobstar while", file, fr, pattern, pr, swallowee);
            if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
              this.debug("globstar found match!", fr, fl, swallowee);
              return true;
            } else {
              if (swallowee === "." || swallowee === ".." || !options.dot && swallowee.charAt(0) === ".") {
                this.debug("dot detected!", file, fr, pattern, pr);
                break;
              }
              this.debug("globstar swallow a segment, and continue");
              fr++;
            }
          }
          if (partial) {
            this.debug("\n>>> no match, partial?", file, fr, pattern, pr);
            if (fr === fl) return true;
          }
          return false;
        }
        var hit;
        if (typeof p === "string") {
          hit = f === p;
          this.debug("string match", p, f, hit);
        } else {
          hit = f.match(p);
          this.debug("pattern match", p, f, hit);
        }
        if (!hit) return false;
      }
      if (fi === fl && pi === pl) {
        return true;
      } else if (fi === fl) {
        return partial;
      } else if (pi === pl) {
        return fi === fl - 1 && file[fi] === "";
      }
      throw new Error("wtf?");
    };
    function globUnescape(s) {
      return s.replace(/\\(.)/g, "$1");
    }
    function regExpEscape(s) {
      return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }
  }
});

// packages/github-action/src/main.ts
import * as core6 from "@actions/core";

// packages/core/dist/platform.js
var TaskResult;
(function(TaskResult2) {
  TaskResult2[TaskResult2["Succeeded"] = 0] = "Succeeded";
  TaskResult2[TaskResult2["Failed"] = 1] = "Failed";
  TaskResult2[TaskResult2["Warning"] = 2] = "Warning";
})(TaskResult || (TaskResult = {}));

// packages/core/dist/arg-builder.js
var ArgBuilder = class {
  args = [];
  /**
   * Add one or more arguments
   */
  arg(values) {
    if (Array.isArray(values)) {
      this.args.push(...values);
    } else {
      this.args.push(values);
    }
    return this;
  }
  /**
   * Add arguments if condition is truthy
   */
  argIf(condition, values) {
    if (condition) {
      return this.arg(values);
    }
    return this;
  }
  /**
   * Add a flag (e.g., '--json')
   */
  flag(name) {
    this.args.push(name);
    return this;
  }
  /**
   * Add a flag if condition is truthy
   */
  flagIf(condition, name) {
    if (condition) {
      return this.flag(name);
    }
    return this;
  }
  /**
   * Add an option with value (e.g., '--publisher', 'myPublisher')
   */
  option(name, value) {
    if (value !== void 0) {
      this.args.push(name, value);
    }
    return this;
  }
  /**
   * Add an option if condition is truthy
   */
  optionIf(condition, name, value) {
    if (condition && value !== void 0) {
      return this.option(name, value);
    }
    return this;
  }
  /**
   * Append raw command line string (split on spaces)
   */
  line(raw) {
    const parts = raw.split(/\s+/).filter((s) => s.length > 0);
    this.args.push(...parts);
    return this;
  }
  /**
   * Build and return the argument array
   */
  build() {
    return [...this.args];
  }
};

// packages/core/dist/json-output-stream.js
import { Writable } from "stream";
var JsonOutputStream = class extends Writable {
  lineWriter;
  /** Accumulated JSON string */
  jsonString = "";
  /** Non-JSON messages (debug output, warnings, etc.) */
  messages = [];
  /**
   * @param lineWriter Function to write non-JSON lines (for logging)
   */
  constructor(lineWriter) {
    super();
    this.lineWriter = lineWriter;
  }
  /**
   * Process a chunk of data from the stream
   */
  _write(chunk, _encoding, callback) {
    const chunkStr = chunk.toString();
    const trimmed = chunkStr.trimStart();
    if (chunkStr.startsWith("[command]")) {
      this.writeOutput(chunkStr, this.lineWriter);
    } else if (!this.jsonString && !this.looksLikeJsonStart(trimmed)) {
      this.messages.push(chunkStr);
      this.writeOutput(chunkStr, this.lineWriter);
    } else {
      this.jsonString += chunkStr;
    }
    callback();
  }
  /**
   * Detect whether a chunk can be the start of a valid JSON value.
   */
  looksLikeJsonStart(input) {
    if (!input) {
      return false;
    }
    return /^(\{|\[|"|-?\d|true\b|false\b|null\b)/.test(input);
  }
  /**
   * Write output line by line (splits on newlines)
   */
  writeOutput(messages, writer) {
    if (!messages) {
      return;
    }
    messages.split("\n").forEach((line) => {
      if (line) {
        writer(line);
      }
    });
  }
  /**
   * Parse the accumulated JSON string
   * @returns Parsed JSON object or undefined if parsing fails
   */
  parseJson() {
    if (!this.jsonString) {
      return void 0;
    }
    try {
      return JSON.parse(this.jsonString);
    } catch (error2) {
      this.lineWriter(`Failed to parse JSON output: ${error2}`);
      return void 0;
    }
  }
};

// packages/core/dist/manifest-utils.js
import path from "path";
async function readManifest(manifestPath, platform) {
  const content = await platform.readFile(manifestPath);
  return JSON.parse(content);
}
function resolveTaskManifestPaths(extensionManifest, extensionManifestPath, _platform) {
  void _platform;
  const taskContributions = getTaskContributions(extensionManifest);
  if (taskContributions.length === 0) {
    return [];
  }
  const manifestDir = path.dirname(extensionManifestPath);
  const taskPaths = [];
  for (const contrib of taskContributions) {
    const taskName = contrib.properties?.name;
    if (!taskName) {
      continue;
    }
    const taskManifestPath = path.join(manifestDir, taskName, "task.json");
    taskPaths.push(taskManifestPath);
  }
  return taskPaths;
}
function getTaskContributions(manifest) {
  if (!manifest.contributions) {
    return [];
  }
  return manifest.contributions.filter((c) => c.type === "ms.vss-distributed-task.task" && c.properties && c.properties.name);
}

// packages/core/dist/tfx-manager.js
import fs from "fs/promises";
import path2 from "path";
var TfxManager = class {
  resolvedPath;
  tfxVersion;
  platform;
  constructor(options) {
    this.tfxVersion = options.tfxVersion;
    this.platform = options.platform;
  }
  /**
   * Resolve tfx binary path using cache-first strategy
   * @returns Path to tfx executable
   */
  async resolve() {
    if (this.resolvedPath) {
      this.platform.debug(`Using cached tfx path: ${this.resolvedPath}`);
      return this.resolvedPath;
    }
    if (this.tfxVersion === "built-in") {
      this.resolvedPath = await this.resolveBuiltIn();
      return this.resolvedPath;
    }
    if (this.tfxVersion === "path") {
      this.resolvedPath = await this.resolveFromPath();
      return this.resolvedPath;
    }
    const exactVersion = await this.resolveVersionSpec(this.tfxVersion);
    this.platform.info(`Resolved tfx-cli version spec '${this.tfxVersion}' to exact version '${exactVersion}'`);
    const cachedPath = this.platform.findCachedTool("tfx-cli", exactVersion);
    if (cachedPath) {
      this.platform.info(`Found cached tfx-cli@${exactVersion} at ${cachedPath}`);
      this.resolvedPath = this.getTfxExecutable(cachedPath);
      return this.resolvedPath;
    }
    this.resolvedPath = await this.downloadAndCache(exactVersion);
    return this.resolvedPath;
  }
  /**
   * Resolve built-in tfx binary from core package dependencies
   * Similar to tfxinstaller v5 behavior
   *
   * The tfx-cli package is a direct dependency of the core package.
   * When bundled, tfx-cli is marked as external and will be in node_modules.
   * We use 'which' to locate it, which will find it in node_modules/.bin/ or PATH.
   */
  async resolveBuiltIn() {
    this.platform.info("Using built-in tfx-cli from core package dependencies");
    const entrypoint = process.argv[1];
    if (!entrypoint) {
      throw new Error("Built-in tfx-cli resolution failed: process.argv[1] is not set.");
    }
    const entryDir = path2.dirname(path2.resolve(entrypoint));
    const tfxExecutable = process.platform === "win32" ? "tfx.cmd" : "tfx";
    const candidateDirs = [entryDir];
    const normalizedEntrypoint = path2.resolve(entrypoint).replace(/\\/g, "/");
    if (normalizedEntrypoint.includes("/node_modules/")) {
      candidateDirs.push(process.cwd());
    }
    for (const candidateDir of candidateDirs) {
      const builtInPath = path2.join(candidateDir, "node_modules", ".bin", tfxExecutable);
      if (await this.pathExists(builtInPath)) {
        this.platform.debug(`Resolved built-in tfx at: ${builtInPath}`);
        return builtInPath;
      }
    }
    throw new Error(`Built-in tfx-cli not found at expected path: ${path2.join(entryDir, "node_modules", ".bin", tfxExecutable)}.`);
  }
  async pathExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Resolve tfx from system PATH
   * No download, uses whatever tfx is installed on the system
   */
  async resolveFromPath() {
    this.platform.info("Using tfx-cli from system PATH");
    const tfxPath = await this.platform.which("tfx", true);
    this.platform.debug(`Resolved tfx from PATH at: ${tfxPath}`);
    return tfxPath;
  }
  /**
   * Resolve a version spec to an exact version
   * Uses npm to resolve version specs like "^0.17", "latest", etc.
   * @param versionSpec - Version spec to resolve (e.g., "^0.17", "latest", "0.17.0")
   * @returns Exact version string (e.g., "0.17.3")
   */
  async resolveVersionSpec(versionSpec) {
    this.platform.debug(`Resolving version spec: ${versionSpec}`);
    try {
      const npmPath = await this.platform.which("npm", true);
      let output = "";
      const outStream = {
        write: (data) => {
          output += data;
        }
      };
      const exitCode = await this.platform.exec(npmPath, ["view", `tfx-cli@${versionSpec}`, "version", "--json"], { outStream });
      if (exitCode !== 0) {
        throw new Error(`npm view failed with exit code ${exitCode}`);
      }
      const trimmed = output.trim();
      let exactVersion;
      if (trimmed.startsWith("[")) {
        const versions = JSON.parse(trimmed);
        exactVersion = versions[versions.length - 1];
      } else if (trimmed.startsWith('"')) {
        exactVersion = JSON.parse(trimmed);
      } else {
        exactVersion = trimmed;
      }
      this.platform.debug(`Resolved '${versionSpec}' to exact version '${exactVersion}'`);
      return exactVersion;
    } catch (error2) {
      throw new Error(`Failed to resolve tfx-cli version spec '${versionSpec}': ${error2}`);
    }
  }
  /**
   * Download tfx from npm and cache it
   * Uses npm install to download tfx-cli and all its dependencies
   * This matches the behavior of the previous tfxinstaller task
   * @param exactVersion - Exact version to download (e.g., "0.17.3")
   */
  async downloadAndCache(exactVersion) {
    this.platform.info(`Installing tfx-cli@${exactVersion} from npm...`);
    const tempDir = this.platform.getTempDir();
    const installDir = path2.join(tempDir, `tfx-install-${Date.now()}`);
    await fs.mkdir(installDir, { recursive: true });
    try {
      this.platform.debug(`Running npm install tfx-cli@${exactVersion} in ${installDir}`);
      const npmPath = await this.platform.which("npm", true);
      const exitCode = await this.platform.exec(npmPath, ["install", `tfx-cli@${exactVersion}`, "--production", "--no-save", "--no-package-lock"], { cwd: installDir });
      if (exitCode !== 0) {
        throw new Error(`npm install failed with exit code ${exitCode}`);
      }
      const tfxPackageDir = path2.join(installDir, "node_modules", "tfx-cli");
      try {
        await fs.access(tfxPackageDir);
      } catch {
        throw new Error(`tfx-cli not found at ${tfxPackageDir} after npm install`);
      }
      this.platform.info(`Successfully installed tfx-cli@${exactVersion} with dependencies`);
      await this.ensureExecutable(tfxPackageDir);
      this.platform.info(`Caching tfx-cli@${exactVersion}...`);
      const nodeModulesDir = path2.join(installDir, "node_modules");
      const cachedDir = await this.platform.cacheDir(nodeModulesDir, "tfx-cli", exactVersion);
      this.platform.info(`Cached tfx-cli@${exactVersion} to ${cachedDir}`);
      const binDir = path2.join(cachedDir, "tfx-cli", "bin");
      return this.getTfxExecutable(binDir);
    } catch (error2) {
      this.platform.warning(`Failed to install tfx-cli@${exactVersion}: ${error2 instanceof Error ? error2.message : String(error2)}`);
      this.platform.warning("Falling back to tfx from PATH");
      try {
        const tfxPath = await this.platform.which("tfx", true);
        return tfxPath;
      } catch {
        throw new Error(`Failed to install tfx-cli@${exactVersion} and no tfx found in PATH. Original error: ${error2 instanceof Error ? error2.message : String(error2)}`);
      }
    } finally {
      try {
        await this.platform.rmRF(installDir);
        this.platform.debug(`Cleaned up temp directory: ${installDir}`);
      } catch (cleanupError) {
        this.platform.warning(`Failed to clean up temp directory ${installDir}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
      }
    }
  }
  /**
   * Ensure tfx binary is executable on Unix systems
   * @param tfxPackageDir - Path to tfx-cli package directory
   */
  async ensureExecutable(tfxPackageDir) {
    if (process.platform === "win32") {
      this.platform.debug("Skipping chmod on Windows");
      return;
    }
    try {
      const tfxBin = path2.join(tfxPackageDir, "bin", "tfx");
      await fs.chmod(tfxBin, 493);
      this.platform.debug(`Made tfx executable: ${tfxBin}`);
    } catch (error2) {
      this.platform.warning(`Failed to chmod tfx: ${error2}`);
    }
  }
  /**
   * Get tfx executable path from directory
   * On Windows, uses tfx.cmd or tfx.ps1
   * On Unix, uses tfx (made executable via chmod)
   */
  getTfxExecutable(dir) {
    const isWindows = process.platform === "win32";
    if (isWindows) {
      const cmdPath = path2.join(dir, "tfx.cmd");
      return cmdPath;
    }
    return path2.join(dir, "tfx");
  }
  /**
   * Execute tfx with given arguments
   * @param args Arguments to pass to tfx
   * @param options Execution options
   * @returns Result with exit code and output
   */
  async execute(args, options) {
    const tfxPath = await this.resolve();
    const finalArgs = [...args];
    let jsonStream;
    if (options?.captureJson) {
      if (!finalArgs.includes("--json")) {
        finalArgs.push("--json");
      }
      if (!finalArgs.includes("--debug-log-stream")) {
        finalArgs.push("--debug-log-stream", "stderr");
      }
      jsonStream = new JsonOutputStream((msg) => this.platform.debug(msg));
    }
    const defaultSilent = options?.captureJson ? true : !this.platform.isDebugEnabled();
    const execOptions = {
      cwd: options?.cwd,
      env: options?.env,
      silent: options?.silent ?? defaultSilent,
      outStream: jsonStream,
      errStream: void 0
    };
    this.platform.debug(`Executing: ${tfxPath} ${finalArgs.join(" ")}`);
    const exitCode = await this.platform.exec(tfxPath, finalArgs, execOptions);
    let parsedJson;
    if (jsonStream) {
      parsedJson = jsonStream.parseJson();
    }
    return {
      exitCode,
      json: parsedJson,
      stdout: jsonStream?.jsonString || "",
      stderr: ""
    };
  }
};

// packages/core/dist/index.js
init_manifest_reader();
init_manifest_editor();
init_vsix_reader();
init_vsix_writer();
init_filesystem_manifest_reader();
init_filesystem_manifest_writer();

// packages/core/dist/validation.js
function validateExtensionId(id) {
  if (!id || typeof id !== "string") {
    throw new Error("Extension ID is required and must be a string");
  }
  if (id.trim() !== id) {
    throw new Error("Extension ID cannot have leading or trailing whitespace");
  }
  if (id.length === 0) {
    throw new Error("Extension ID cannot be empty");
  }
  if (id.length > 200) {
    throw new Error("Extension ID cannot exceed 200 characters");
  }
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  if (!validPattern.test(id)) {
    throw new Error("Extension ID can only contain letters, numbers, dots (.), underscores (_), and hyphens (-)");
  }
}
function validatePublisherId(id) {
  if (!id || typeof id !== "string") {
    throw new Error("Publisher ID is required and must be a string");
  }
  if (id.trim() !== id) {
    throw new Error("Publisher ID cannot have leading or trailing whitespace");
  }
  if (id.length === 0) {
    throw new Error("Publisher ID cannot be empty");
  }
  if (id.length > 200) {
    throw new Error("Publisher ID cannot exceed 200 characters");
  }
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  if (!validPattern.test(id)) {
    throw new Error("Publisher ID can only contain letters, numbers, dots (.), underscores (_), and hyphens (-)");
  }
}
function validateAccountUrl(url) {
  if (!url || typeof url !== "string") {
    throw new Error("Account URL is required and must be a string");
  }
  if (url.trim() !== url) {
    throw new Error("Account URL cannot have leading or trailing whitespace");
  }
  if (url.length === 0) {
    throw new Error("Account URL cannot be empty");
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Account URL must be a valid URL");
  }
  if (parsedUrl.protocol !== "https:") {
    throw new Error("Account URL must use HTTPS protocol");
  }
  const validDomains = ["dev.azure.com", "visualstudio.com", "azure.com"];
  const hostname = parsedUrl.hostname.toLowerCase();
  const isValidDomain = validDomains.some((domain) => hostname === domain || hostname.endsWith("." + domain));
  if (!isValidDomain) {
    throw new Error("Account URL must be an Azure DevOps URL (dev.azure.com, *.visualstudio.com, or *.azure.com)");
  }
}
function validateVersion(version) {
  if (!version || typeof version !== "string") {
    throw new Error("Version is required and must be a string");
  }
  if (version.trim() !== version) {
    throw new Error("Version cannot have leading or trailing whitespace");
  }
  if (version.length === 0) {
    throw new Error("Version cannot be empty");
  }
  const semverPattern = /^\d+(\.\d+){0,3}$/;
  if (!semverPattern.test(version)) {
    throw new Error("Version must follow semantic versioning (e.g., 1.0.0, 1.0.0.0)");
  }
  const parts = version.split(".");
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (num < 0 || num > 999999) {
      throw new Error("Version numbers must be between 0 and 999999");
    }
  }
}
async function getBinaryVersion(binary, platform) {
  try {
    const versionArgs = {
      node: ["--version"],
      npm: ["--version"],
      az: ["--version"],
      tfx: ["version", "--no-prompt", "--no-color"]
      // tfx version command with clean output
    };
    const args = versionArgs[binary] || ["--version"];
    const exitCode = await platform.exec(binary, args, {
      silent: true,
      ignoreReturnCode: true
    });
    if (exitCode === 0) {
      return "available";
    }
    return null;
  } catch {
    return null;
  }
}
async function validateBinaryAvailable(binary, platform, logVersion = true) {
  if (!binary || typeof binary !== "string") {
    throw new Error("Binary name is required and must be a string");
  }
  platform.debug(`Checking for required binary: ${binary}`);
  try {
    const binaryPath = await platform.which(binary, true);
    platform.debug(`Found ${binary} at: ${binaryPath}`);
    if (logVersion) {
      const version = await getBinaryVersion(binary, platform);
      if (version) {
        platform.debug(`${binary} version: ${version}`);
      } else {
        platform.debug(`${binary} version: Unable to determine`);
      }
    }
  } catch (error2) {
    const errorMessage = error2 instanceof Error ? error2.message : String(error2);
    throw new Error(`Required binary '${binary}' is not available. Please ensure ${binary} is installed and in your PATH. Error: ${errorMessage}`);
  }
}
async function validateNodeAvailable(platform, logVersion = true) {
  await validateBinaryAvailable("node", platform, logVersion);
}
async function validateNpmAvailable(platform, logVersion = true) {
  await validateBinaryAvailable("npm", platform, logVersion);
}
async function validateTfxAvailable(platform, logVersion = true) {
  await validateBinaryAvailable("tfx", platform, logVersion);
}
async function validateAzureCliAvailable(platform, logVersion = true) {
  await validateBinaryAvailable("az", platform, logVersion);
}

// packages/core/dist/commands/package.js
init_filesystem_manifest_reader();
init_manifest_editor();
async function packageExtension(options, tfx, platform) {
  platform.info("Packaging extension...");
  const args = new ArgBuilder().arg(["extension", "create"]).flag("--json").flag("--no-color");
  if (options.rootFolder) {
    args.option("--root", options.rootFolder);
  }
  if (options.manifestGlobs && options.manifestGlobs.length > 0) {
    args.flag("--manifest-globs");
    options.manifestGlobs.forEach((glob) => args.arg(glob));
  }
  if (options.overridesFile) {
    args.option("--overrides-file", options.overridesFile);
  }
  if (options.publisherId) {
    args.option("--publisher", options.publisherId);
  }
  const extensionId = options.extensionId;
  if (extensionId) {
    args.option("--extension-id", extensionId);
  }
  if (options.outputPath) {
    args.option("--output-path", options.outputPath);
  }
  if (options.bypassValidation) {
    args.flag("--bypass-validation");
  }
  if (options.revVersion) {
    args.flag("--rev-version");
  }
  let cleanupWriter = null;
  const synchronizeBinaryFileEntries = true;
  const shouldApplyManifestOptions = options.updateTasksVersion || options.updateTasksId || options.extensionVersion || options.extensionName || options.extensionVisibility || options.extensionPricing || synchronizeBinaryFileEntries;
  if (shouldApplyManifestOptions) {
    platform.info("Updating task manifests before packaging...");
    try {
      const rootFolder = options.rootFolder || ".";
      const manifestGlobs = options.manifestGlobs || ["vss-extension.json"];
      const reader = new FilesystemManifestReader({
        rootFolder,
        manifestGlobs,
        platform
      });
      const editor = ManifestEditor.fromReader(reader);
      await editor.applyOptions({
        publisherId: options.publisherId,
        extensionId: options.extensionId,
        extensionVersion: options.extensionVersion,
        extensionName: options.extensionName,
        extensionVisibility: options.extensionVisibility,
        extensionPricing: options.extensionPricing,
        updateTasksVersion: options.updateTasksVersion,
        updateTasksVersionType: options.updateTasksVersionType,
        updateTasksId: options.updateTasksId,
        synchronizeBinaryFileEntries
      });
      const writer = await editor.toWriter();
      await writer.writeToFilesystem();
      const overridesPath = writer.getOverridesPath();
      if (overridesPath) {
        platform.debug(`Using overrides file: ${overridesPath}`);
        args.option("--overrides-file", overridesPath);
      }
      cleanupWriter = async () => {
        await writer.close();
        await reader.close();
      };
      platform.info("Task manifests updated successfully");
    } catch (err) {
      platform.error(`Failed to update task manifests: ${err.message}`);
      throw err;
    }
  }
  try {
    const result = await tfx.execute(args.build(), { captureJson: true });
    if (result.exitCode !== 0) {
      platform.error(`tfx exited with code ${result.exitCode}`);
      throw new Error(`tfx extension create failed with exit code ${result.exitCode}`);
    }
    const json = result.json;
    if (!json || !json.path) {
      throw new Error("tfx did not return expected JSON output with path");
    }
    platform.setVariable("vsixPath", json.path, false, true);
    platform.info(`Packaged extension: ${json.path}`);
    return {
      vsixPath: json.path,
      extensionId: json.id || extensionId || "",
      extensionVersion: json.version || options.extensionVersion || "",
      publisherId: json.publisher || options.publisherId || "",
      exitCode: result.exitCode
    };
  } finally {
    if (cleanupWriter) {
      await cleanupWriter();
    }
  }
}

// packages/core/dist/commands/publish.js
init_manifest_editor();
init_vsix_reader();
async function executeTfxPublish(tfx, args, platform, options, publishedVsixPath) {
  if (options.shareWith && options.shareWith.length > 0) {
    const isPublic = options.extensionVisibility === "public" || options.extensionVisibility === "public_preview";
    if (isPublic) {
      platform.warning("Ignoring shareWith - not available for public extensions");
    } else {
      args.flag("--share-with");
      options.shareWith.forEach((org) => args.arg(org));
    }
  }
  if (options.noWaitValidation) {
    args.flag("--no-wait-validation");
  }
  if (options.bypassValidation) {
    args.flag("--bypass-validation");
  }
  const result = await tfx.execute(args.build(), { captureJson: true });
  if (result.exitCode !== 0) {
    platform.error(`tfx exited with code ${result.exitCode}`);
    throw new Error(`tfx extension publish failed with exit code ${result.exitCode}`);
  }
  const json = result.json;
  if (!json || !json.published) {
    throw new Error("tfx did not return expected JSON output with published status");
  }
  let extensionId = "";
  let extensionVersion = "";
  let publisherId = "";
  if (options.publishSource === "vsix") {
    const metadataVsixPath = publishedVsixPath ?? options.vsixFile;
    if (metadataVsixPath && await platform.fileExists(metadataVsixPath)) {
      try {
        const reader = await VsixReader.open(metadataVsixPath);
        const metadata = await reader.getMetadata();
        await reader.close();
        extensionId = metadata.extensionId;
        extensionVersion = metadata.version;
        publisherId = metadata.publisher;
      } catch (error2) {
        platform.debug(`Could not read VSIX metadata from ${metadataVsixPath}: ${error2 instanceof Error ? error2.message : String(error2)}`);
      }
    }
  } else {
    extensionId = json.id || "";
    extensionVersion = json.version || "";
    publisherId = json.publisher || "";
  }
  extensionId = extensionId || options.extensionId || "";
  extensionVersion = extensionVersion || options.extensionVersion || "";
  publisherId = publisherId || options.publisherId || "";
  let vsixPath = "";
  if (options.publishSource === "manifest") {
    vsixPath = json.packaged || "";
  } else {
    vsixPath = publishedVsixPath || options.vsixFile || "";
  }
  platform.info(`Published extension: ${extensionId || "(unknown id)"} v${extensionVersion || "(unknown version)"}`);
  return {
    published: json.published === true,
    vsixPath,
    extensionId,
    extensionVersion,
    publisherId,
    exitCode: result.exitCode
  };
}
async function publishExtension(options, auth, tfx, platform) {
  platform.info("Publishing extension...");
  const args = new ArgBuilder().arg(["extension", "publish"]).flag("--json").flag("--no-color").flag("--debug-log-stream").arg("stderr");
  args.option("--service-url", auth.serviceUrl);
  if (auth.authType === "pat") {
    args.option("--auth-type", "pat");
    args.option("--token", auth.token);
    platform.setSecret(auth.token);
  } else if (auth.authType === "basic") {
    args.option("--auth-type", "basic");
    args.option("--username", auth.username);
    args.option("--password", auth.password);
    platform.setSecret(auth.password);
  }
  if (options.publishSource === "manifest") {
    if (options.rootFolder) {
      args.option("--root", options.rootFolder);
    }
    if (options.manifestGlobs && options.manifestGlobs.length > 0) {
      args.flag("--manifest-globs");
      options.manifestGlobs.forEach((glob) => args.arg(glob));
    }
    if (options.overridesFile) {
      args.option("--overrides-file", options.overridesFile);
    }
    if (options.publisherId) {
      args.option("--publisher", options.publisherId);
    }
    const extensionId = options.extensionId;
    if (extensionId) {
      args.option("--extension-id", extensionId);
    }
    if (options.extensionName) {
      args.option("--extension-name", options.extensionName);
    }
    if (options.extensionVersion) {
      args.option("--extension-version", options.extensionVersion);
    }
    if (options.extensionVisibility) {
      args.option("--extension-visibility", options.extensionVisibility);
    }
    let cleanupWriter = null;
    const synchronizeBinaryFileEntries = true;
    if (options.updateTasksVersion || options.updateTasksId || options.extensionPricing || synchronizeBinaryFileEntries) {
      platform.info("Updating task manifests before publishing...");
      try {
        const { FilesystemManifestReader: FilesystemManifestReader2 } = await Promise.resolve().then(() => (init_filesystem_manifest_reader(), filesystem_manifest_reader_exports));
        const { ManifestEditor: ManifestEditor2 } = await Promise.resolve().then(() => (init_manifest_editor(), manifest_editor_exports));
        const rootFolder = options.rootFolder || ".";
        const manifestGlobs = options.manifestGlobs || ["vss-extension.json"];
        const reader = new FilesystemManifestReader2({
          rootFolder,
          manifestGlobs,
          platform
        });
        const editor = ManifestEditor2.fromReader(reader);
        await editor.applyOptions({
          publisherId: options.publisherId,
          extensionId: options.extensionId,
          extensionVersion: options.extensionVersion,
          extensionName: options.extensionName,
          extensionVisibility: options.extensionVisibility,
          extensionPricing: options.extensionPricing,
          updateTasksVersion: options.updateTasksVersion,
          updateTasksVersionType: options.updateTasksVersionType,
          updateTasksId: options.updateTasksId,
          synchronizeBinaryFileEntries
        });
        const writer = await editor.toWriter();
        await writer.writeToFilesystem();
        const overridesPath = writer.getOverridesPath();
        if (overridesPath) {
          platform.debug(`Using overrides file: ${overridesPath}`);
          args.option("--overrides-file", overridesPath);
        }
        cleanupWriter = async () => {
          await writer.close();
          await reader.close();
        };
        platform.info("Task manifests updated successfully");
      } catch (err) {
        platform.error(`Failed to update task manifests: ${err.message}`);
        throw err;
      }
    }
    try {
      return await executeTfxPublish(tfx, args, platform, options);
    } finally {
      if (cleanupWriter) {
        await cleanupWriter();
      }
    }
  } else {
    if (!options.vsixFile) {
      throw new Error('vsixFile is required when publishSource is "vsix"');
    }
    const fileExists = await platform.fileExists(options.vsixFile);
    if (!fileExists) {
      throw new Error(`VSIX file not found: ${options.vsixFile}`);
    }
    const needsModification = options.publisherId || options.extensionId || options.extensionVersion || options.extensionName || options.extensionVisibility || options.extensionPricing || options.updateTasksVersion || options.updateTasksId;
    let vsixPathToPublish = options.vsixFile;
    if (needsModification) {
      platform.info("Modifying VSIX before publishing...");
      const reader = await VsixReader.open(options.vsixFile);
      const editor = ManifestEditor.fromReader(reader);
      await editor.applyOptions({
        publisherId: options.publisherId,
        extensionId: options.extensionId,
        extensionVersion: options.extensionVersion,
        extensionName: options.extensionName,
        extensionVisibility: options.extensionVisibility,
        extensionPricing: options.extensionPricing,
        updateTasksVersion: options.updateTasksVersion,
        updateTasksVersionType: options.updateTasksVersionType,
        updateTasksId: options.updateTasksId
      });
      const writer = await editor.toWriter();
      const tempDir = platform.getTempDir();
      const tempVsixPath = `${tempDir}/temp-${Date.now()}.vsix`;
      platform.debug(`Writing modified VSIX to: ${tempVsixPath}`);
      await writer.writeToFile(tempVsixPath);
      await writer.close();
      await reader.close();
      vsixPathToPublish = tempVsixPath;
      args.option("--vsix", tempVsixPath);
      platform.info("VSIX modifications applied successfully");
    } else {
      args.option("--vsix", options.vsixFile);
    }
    return executeTfxPublish(tfx, args, platform, options, vsixPathToPublish);
  }
  return executeTfxPublish(tfx, args, platform, options);
}

// packages/core/dist/commands/unpublish.js
async function unpublishExtension(options, auth, tfx, platform) {
  platform.info(`Unpublishing extension ${options.publisherId}.${options.extensionId}...`);
  const extensionId = options.extensionId;
  const args = new ArgBuilder().arg(["extension", "unpublish"]).flag("--json").flag("--no-color").option("--publisher", options.publisherId).option("--extension-id", extensionId);
  args.option("--service-url", auth.serviceUrl);
  if (auth.authType === "pat") {
    args.option("--auth-type", "pat");
    args.option("--token", auth.token);
    platform.setSecret(auth.token);
  } else if (auth.authType === "basic") {
    args.option("--auth-type", "basic");
    args.option("--username", auth.username);
    args.option("--password", auth.password);
    platform.setSecret(auth.password);
  }
  const result = await tfx.execute(args.build(), { captureJson: true });
  if (result.exitCode !== 0) {
    platform.error(`tfx exited with code ${result.exitCode}`);
    throw new Error(`tfx extension unpublish failed with exit code ${result.exitCode}`);
  }
  platform.info(`Successfully unpublished extension: ${options.publisherId}.${extensionId}`);
  return {
    success: true,
    extensionId,
    publisherId: options.publisherId,
    exitCode: result.exitCode
  };
}

// packages/core/dist/commands/share.js
async function shareExtension(options, auth, tfx, platform) {
  if (!options.shareWith || options.shareWith.length === 0) {
    throw new Error("shareWith must contain at least one organization");
  }
  platform.info(`Sharing extension ${options.publisherId}.${options.extensionId} with ${options.shareWith.length} organization(s)...`);
  const extensionId = options.extensionId;
  const args = new ArgBuilder().arg(["extension", "share"]).flag("--json").flag("--no-color").option("--publisher", options.publisherId).option("--extension-id", extensionId).flag("--share-with");
  options.shareWith.forEach((org) => args.arg(org));
  args.option("--service-url", auth.serviceUrl);
  if (auth.authType === "pat") {
    args.option("--auth-type", "pat");
    args.option("--token", auth.token);
    platform.setSecret(auth.token);
  } else if (auth.authType === "basic") {
    args.option("--auth-type", "basic");
    args.option("--username", auth.username);
    args.option("--password", auth.password);
    platform.setSecret(auth.password);
  }
  const result = await tfx.execute(args.build(), { captureJson: true });
  if (result.exitCode !== 0) {
    platform.error(`tfx exited with code ${result.exitCode}`);
    throw new Error(`tfx extension share failed with exit code ${result.exitCode}`);
  }
  platform.info(`Successfully shared extension with: ${options.shareWith.join(", ")}`);
  return {
    success: true,
    extensionId,
    publisherId: options.publisherId,
    sharedWith: options.shareWith,
    exitCode: result.exitCode
  };
}

// packages/core/dist/commands/unshare.js
async function unshareExtension(options, auth, tfx, platform) {
  if (!options.unshareWith || options.unshareWith.length === 0) {
    throw new Error("unshareWith must contain at least one organization");
  }
  platform.info(`Unsharing extension ${options.publisherId}.${options.extensionId} from ${options.unshareWith.length} organization(s)...`);
  const extensionId = options.extensionId;
  const args = new ArgBuilder().arg(["extension", "unshare"]).flag("--json").flag("--no-color").option("--publisher", options.publisherId).option("--extension-id", extensionId).flag("--unshare-with");
  options.unshareWith.forEach((org) => args.arg(org));
  args.option("--service-url", auth.serviceUrl);
  if (auth.authType === "pat") {
    args.option("--auth-type", "pat");
    args.option("--token", auth.token);
    platform.setSecret(auth.token);
  } else if (auth.authType === "basic") {
    args.option("--auth-type", "basic");
    args.option("--username", auth.username);
    args.option("--password", auth.password);
    platform.setSecret(auth.password);
  }
  const result = await tfx.execute(args.build(), { captureJson: true });
  if (result.exitCode !== 0) {
    platform.error(`tfx exited with code ${result.exitCode}`);
    throw new Error(`tfx extension unshare failed with exit code ${result.exitCode}`);
  }
  platform.info(`Successfully unshared extension from: ${options.unshareWith.join(", ")}`);
  return {
    success: true,
    extensionId,
    publisherId: options.publisherId,
    unsharedFrom: options.unshareWith,
    exitCode: result.exitCode
  };
}

// packages/core/dist/commands/install.js
async function installExtension(options, auth, tfx, platform) {
  if (!options.accounts || options.accounts.length === 0) {
    throw new Error("accounts must contain at least one organization URL");
  }
  platform.info(`Installing extension ${options.publisherId}.${options.extensionId} to ${options.accounts.length} organization(s)...`);
  const extensionId = options.extensionId;
  const accountResults = [];
  let overallExitCode = 0;
  for (const account of options.accounts) {
    platform.info(`Installing to ${account}...`);
    const args = new ArgBuilder().arg(["extension", "install"]).flag("--json").flag("--no-color").option("--publisher", options.publisherId).option("--extension-id", extensionId).option("--service-url", account);
    if (options.extensionVersion) {
      args.option("--extension-version", options.extensionVersion);
    }
    args.option("--auth-type", auth.authType);
    if (auth.authType === "pat") {
      args.option("--token", auth.token);
      platform.setSecret(auth.token);
    } else if (auth.authType === "basic") {
      args.option("--username", auth.username);
      args.option("--password", auth.password);
      platform.setSecret(auth.password);
    }
    try {
      const result = await tfx.execute(args.build(), { captureJson: true });
      if (result.exitCode === 0) {
        accountResults.push({
          account,
          success: true,
          alreadyInstalled: false
        });
        platform.info(`\u2713 Successfully installed to ${account}`);
      } else {
        const stderr = result.stderr || "";
        const alreadyInstalled = stderr.includes("TF1590010");
        if (alreadyInstalled) {
          accountResults.push({
            account,
            success: true,
            alreadyInstalled: true
          });
          platform.warning(`Extension already installed in ${account} - continuing`);
        } else {
          accountResults.push({
            account,
            success: false,
            alreadyInstalled: false,
            error: `Exit code ${result.exitCode}`
          });
          platform.error(`\u2717 Failed to install to ${account}: exit code ${result.exitCode}`);
          overallExitCode = result.exitCode;
        }
      }
    } catch (err) {
      accountResults.push({
        account,
        success: false,
        alreadyInstalled: false,
        error: String(err)
      });
      platform.error(`\u2717 Failed to install to ${account}: ${err}`);
      overallExitCode = 1;
    }
  }
  const allSuccess = accountResults.every((r) => r.success);
  const successCount = accountResults.filter((r) => r.success).length;
  platform.info(`Installation complete: ${successCount}/${options.accounts.length} succeeded`);
  return {
    extensionId,
    publisherId: options.publisherId,
    accountResults,
    allSuccess,
    exitCode: overallExitCode
  };
}

// packages/core/dist/commands/show.js
async function showExtension(options, auth, tfx, platform) {
  platform.info(`Querying extension ${options.publisherId}.${options.extensionId}...`);
  const extensionId = options.extensionId;
  const args = new ArgBuilder().arg(["extension", "show"]).flag("--json").flag("--no-color").option("--publisher", options.publisherId).option("--extension-id", extensionId);
  args.option("--service-url", auth.serviceUrl);
  if (auth.authType === "pat") {
    args.option("--auth-type", "pat");
    args.option("--token", auth.token);
    platform.setSecret(auth.token);
  } else if (auth.authType === "basic") {
    args.option("--auth-type", "basic");
    args.option("--username", auth.username);
    args.option("--password", auth.password);
    platform.setSecret(auth.password);
  }
  const result = await tfx.execute(args.build(), { captureJson: true });
  if (result.exitCode !== 0) {
    platform.error(`tfx exited with code ${result.exitCode}`);
    throw new Error(`tfx extension show failed with exit code ${result.exitCode}`);
  }
  const json = result.json;
  if (!json) {
    throw new Error("tfx did not return expected JSON output");
  }
  const metadata = {
    id: json.extensionId || json.id || extensionId,
    publisher: json.publisher || options.publisherId,
    version: json.version || json.versions?.[0]?.version || "",
    name: json.extensionName || json.displayName || json.name,
    description: json.shortDescription || json.description,
    categories: json.categories,
    tags: json.tags,
    ...json
    // Include all other fields
  };
  platform.info(`Extension: ${metadata.name || metadata.id} v${metadata.version}`);
  if (metadata.description) {
    platform.info(`Description: ${metadata.description}`);
  }
  return {
    metadata,
    exitCode: result.exitCode
  };
}

// packages/core/dist/commands/query-version.js
function applyVersionAction(version, versionAction) {
  if (versionAction === "None") {
    return version;
  }
  const versionParts = version.split(".").map((part) => Number.parseInt(part, 10));
  if (versionParts.length !== 3 || Number.isNaN(versionParts[0]) || Number.isNaN(versionParts[1]) || Number.isNaN(versionParts[2])) {
    throw new Error(`Version '${version}' is not a valid semantic version (major.minor.patch)`);
  }
  switch (versionAction) {
    case "Major":
      return `${versionParts[0] + 1}.0.0`;
    case "Minor":
      return `${versionParts[0]}.${versionParts[1] + 1}.0`;
    case "Patch":
      return `${versionParts[0]}.${versionParts[1]}.${versionParts[2] + 1}`;
    default:
      return version;
  }
}
async function queryVersion(options, auth, tfx, platform) {
  const versionAction = options.versionAction ?? "None";
  if (options.extensionVersionOverrideVariable) {
    platform.debug(`Override variable '${options.extensionVersionOverrideVariable}' specified, checking for value.`);
    const overrideVersion = platform.getVariable(options.extensionVersionOverrideVariable);
    if (overrideVersion) {
      platform.info(`Ignoring marketplace version and using supplied override: ${overrideVersion}.`);
      platform.setVariable("currentVersion", overrideVersion, false, true);
      platform.setVariable("proposedVersion", overrideVersion, false, true);
      return {
        currentVersion: overrideVersion,
        proposedVersion: overrideVersion,
        version: overrideVersion,
        source: "override"
      };
    }
  }
  const showResult = await showExtension({
    publisherId: options.publisherId,
    extensionId: options.extensionId
  }, auth, tfx, platform);
  const marketplaceVersion = showResult.metadata.version;
  if (!marketplaceVersion) {
    throw new Error("Could not determine extension version from marketplace response");
  }
  platform.info(`Latest version   : ${marketplaceVersion}.`);
  platform.info(`Requested action : ${versionAction}.`);
  const updatedVersion = applyVersionAction(marketplaceVersion, versionAction);
  if (updatedVersion !== marketplaceVersion) {
    platform.info(`Updated to       : ${updatedVersion}.`);
  }
  platform.setVariable("currentVersion", marketplaceVersion, false, true);
  platform.setVariable("proposedVersion", updatedVersion, false, true);
  return {
    currentVersion: marketplaceVersion,
    proposedVersion: updatedVersion,
    version: updatedVersion,
    source: "marketplace"
  };
}

// packages/core/dist/commands/wait-for-validation.js
async function waitForValidation(options, auth, tfx, platform) {
  platform.info(`Validating extension ${options.publisherId}.${options.extensionId}...`);
  const extensionId = options.extensionId;
  const maxRetries = options.maxRetries ?? 10;
  const minTimeoutMs = (options.minTimeout ?? 1) * 60 * 1e3;
  const maxTimeoutMs = (options.maxTimeout ?? 15) * 60 * 1e3;
  let attempts = 0;
  let lastStatus = "pending";
  let lastExitCode = 0;
  while (attempts < maxRetries) {
    attempts++;
    platform.info(`Validation attempt ${attempts}/${maxRetries}...`);
    const args = new ArgBuilder().arg(["extension", "isvalid"]).flag("--json").flag("--no-color").option("--publisher", options.publisherId).option("--extension-id", extensionId);
    if (options.rootFolder) {
      args.option("--root", options.rootFolder);
    }
    if (options.manifestGlobs && options.manifestGlobs.length > 0) {
      args.flag("--manifest-globs");
      options.manifestGlobs.forEach((glob) => args.arg(glob));
    }
    args.option("--service-url", auth.serviceUrl);
    if (auth.authType === "pat") {
      args.option("--auth-type", "pat");
      args.option("--token", auth.token);
      platform.setSecret(auth.token);
    } else if (auth.authType === "basic") {
      args.option("--auth-type", "basic");
      args.option("--username", auth.username);
      args.option("--password", auth.password);
      platform.setSecret(auth.password);
    }
    try {
      const result = await tfx.execute(args.build(), { captureJson: true });
      lastExitCode = result.exitCode;
      const json = result.json;
      if (json && json.status) {
        lastStatus = json.status;
        switch (lastStatus) {
          case "success":
            platform.info("\u2713 Extension validation succeeded");
            return {
              status: lastStatus,
              isValid: true,
              extensionId,
              publisherId: options.publisherId,
              attempts,
              exitCode: result.exitCode
            };
          case "pending":
            platform.info("\u23F3 Validation pending, retrying...");
            if (attempts < maxRetries) {
              const waitTime = Math.min(minTimeoutMs * Math.pow(2, attempts - 1), maxTimeoutMs);
              platform.debug(`Waiting ${waitTime / 1e3}s before retry...`);
              await sleep(waitTime);
            }
            break;
          case "failed":
          case "error":
            platform.error(`\u2717 Extension validation failed: ${lastStatus}`);
            return {
              status: lastStatus,
              isValid: false,
              extensionId,
              publisherId: options.publisherId,
              attempts,
              exitCode: result.exitCode
            };
          default:
            platform.warning(`Unknown validation status: ${lastStatus}`);
            break;
        }
      } else {
        platform.warning("No status in validation response");
      }
    } catch (err) {
      platform.error(`Validation attempt ${attempts} failed: ${err}`);
      if (attempts >= maxRetries) {
        throw err;
      }
      await sleep(minTimeoutMs);
    }
  }
  platform.error(`\u2717 Extension validation timed out after ${attempts} attempts (status: ${lastStatus})`);
  return {
    status: lastStatus,
    isValid: false,
    extensionId,
    publisherId: options.publisherId,
    attempts,
    exitCode: lastExitCode
  };
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// packages/core/dist/commands/wait-for-installation.js
import { WebApi, getPersonalAccessTokenHandler } from "azure-devops-node-api";
init_vsix_reader();
function validateWaitForInstallationServiceUrl(serviceUrl) {
  if (!serviceUrl) {
    throw new Error("wait-for-installation requires service-url to be set to an Azure DevOps organization/server endpoint (not marketplace)");
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(serviceUrl);
  } catch {
    throw new Error("wait-for-installation requires service-url to be a valid HTTPS Azure DevOps organization/server URL");
  }
  const hostname = parsedUrl.hostname.toLowerCase();
  if (hostname === "marketplace.visualstudio.com") {
    throw new Error("wait-for-installation cannot use the default marketplace endpoint. Set service-url to https://dev.azure.com/<organization>");
  }
  if (parsedUrl.protocol !== "https:") {
    throw new Error("wait-for-installation requires service-url to be a valid HTTPS Azure DevOps organization/server URL");
  }
}
async function resolveExpectedTasks(options, platform) {
  if (options.expectedTasks && options.expectedTasks.length > 0) {
    platform.debug(`Using ${options.expectedTasks.length} expected tasks from options`);
    return options.expectedTasks;
  }
  if (options.manifestPath) {
    try {
      platform.debug(`Reading task versions from manifest: ${options.manifestPath}`);
      const manifest = await readManifest(options.manifestPath, platform);
      const taskPaths = resolveTaskManifestPaths(manifest, options.manifestPath, platform);
      const tasks = [];
      for (const taskPath of taskPaths) {
        try {
          const taskManifest = await readManifest(taskPath, platform);
          if (taskManifest.name && taskManifest.version) {
            const version = `${taskManifest.version.Major}.${taskManifest.version.Minor}.${taskManifest.version.Patch}`;
            tasks.push({
              name: taskManifest.name,
              versions: [version]
            });
            platform.debug(`Found task ${taskManifest.name} v${version}`);
          }
        } catch (error2) {
          platform.warning(`Failed to read task manifest ${taskPath}: ${error2 instanceof Error ? error2.message : String(error2)}`);
        }
      }
      if (tasks.length > 0) {
        platform.debug(`Resolved ${tasks.length} tasks from manifest`);
        return tasks;
      }
    } catch (error2) {
      platform.warning(`Failed to read manifest ${options.manifestPath}: ${error2 instanceof Error ? error2.message : String(error2)}`);
    }
  }
  if (options.vsixPath) {
    try {
      platform.debug(`Reading task versions from VSIX: ${options.vsixPath}`);
      const reader = await VsixReader.open(options.vsixPath);
      try {
        const tasksInfo = await reader.getTasksInfo();
        const tasks = tasksInfo.map((task) => ({
          name: task.name,
          versions: [task.version]
        }));
        platform.debug(`Resolved ${tasks.length} tasks from VSIX`);
        return tasks;
      } finally {
        await reader.close();
      }
    } catch (error2) {
      platform.warning(`Failed to read VSIX ${options.vsixPath}: ${error2 instanceof Error ? error2.message : String(error2)}`);
    }
  }
  return [];
}
async function waitForInstallation(options, auth, platform) {
  validateWaitForInstallationServiceUrl(auth.serviceUrl);
  const fullExtensionId = options.extensionId;
  const timeoutMs = (options.timeoutMinutes ?? 10) * 6e4;
  const pollingIntervalMs = (options.pollingIntervalSeconds ?? 30) * 1e3;
  platform.debug(`Verifying installation of ${options.publisherId}.${fullExtensionId} in ${options.accounts.length} account(s)`);
  const expectedTasks = await resolveExpectedTasks(options, platform);
  const accountResults = [];
  for (const accountUrl of options.accounts) {
    platform.debug(`Checking account: ${accountUrl}`);
    platform.info(`Polling for task availability (timeout: ${options.timeoutMinutes ?? 10} minutes, interval: ${options.pollingIntervalSeconds ?? 30} seconds)`);
    try {
      if (!auth.token) {
        throw new Error("PAT token is required for waitForInstallation command");
      }
      const handler = getPersonalAccessTokenHandler(auth.token);
      const connection = new WebApi(accountUrl, handler);
      const taskAgentApi = await connection.getTaskAgentApi();
      const deadline = Date.now() + timeoutMs;
      let lastError;
      let found = false;
      let finalInstalledTasks = [];
      let finalMissingTasks = [];
      let finalMissingVersions = [];
      let pollCount = 0;
      while (Date.now() < deadline && !found) {
        pollCount++;
        const remainingMs = deadline - Date.now();
        const remainingMinutes = Math.ceil(remainingMs / 6e4);
        platform.debug(`Poll attempt ${pollCount} (${remainingMinutes} minute(s) remaining)`);
        try {
          const taskDefinitions = await taskAgentApi.getTaskDefinitions();
          const installedTasks = [];
          const missingTasks = [];
          const missingVersions = [];
          if (expectedTasks.length > 0) {
            for (const expectedTask of expectedTasks) {
              const installedTaskVersions = taskDefinitions.filter((t) => t.name?.toLowerCase() === expectedTask.name.toLowerCase() && t.id && t.version);
              if (installedTaskVersions.length === 0) {
                missingTasks.push(expectedTask.name);
                for (const ver of expectedTask.versions) {
                  missingVersions.push(`${expectedTask.name}@${ver}`);
                }
                continue;
              }
              for (const installedTask of installedTaskVersions) {
                const installedVersion = `${installedTask.version.major}.${installedTask.version.minor}.${installedTask.version.patch}`;
                const matchesExpected = expectedTask.versions.includes(installedVersion);
                installedTasks.push({
                  name: installedTask.name,
                  id: installedTask.id,
                  version: installedVersion,
                  friendlyName: installedTask.friendlyName || installedTask.name,
                  matchesExpected
                });
              }
              const installedVersionStrings = installedTaskVersions.map((t) => `${t.version.major}.${t.version.minor}.${t.version.patch}`);
              for (const expectedVer of expectedTask.versions) {
                if (!installedVersionStrings.includes(expectedVer)) {
                  missingVersions.push(`${expectedTask.name}@${expectedVer}`);
                  platform.debug(`Missing version ${expectedVer} for task ${expectedTask.name}`);
                }
              }
            }
            if (missingTasks.length === 0 && missingVersions.length === 0) {
              found = true;
              finalInstalledTasks = installedTasks;
              finalMissingTasks = missingTasks;
              finalMissingVersions = missingVersions;
              const uniqueTasks = new Set(expectedTasks.map((t) => t.name));
              const totalExpectedVersions = expectedTasks.reduce((sum, t) => {
                return sum + t.versions.length;
              }, 0);
              platform.info(`\u2713 All ${uniqueTasks.size} expected task(s) with ${totalExpectedVersions} version(s) found in ${accountUrl}`);
            } else if (missingTasks.length > 0) {
              platform.debug(`Missing ${missingTasks.length} task(s): ${missingTasks.join(", ")}`);
            } else if (missingVersions.length > 0) {
              platform.debug(`Missing ${missingVersions.length} version(s): ${missingVersions.join(", ")}`);
            }
          } else {
            for (const task of taskDefinitions) {
              if (task.name && task.id && task.version) {
                installedTasks.push({
                  name: task.name,
                  id: task.id,
                  version: `${task.version.major}.${task.version.minor}.${task.version.patch}`,
                  friendlyName: task.friendlyName || task.name,
                  matchesExpected: true
                  // No expectations, so all match
                });
              }
            }
            if (installedTasks.length > 0) {
              found = true;
              finalInstalledTasks = installedTasks;
              finalMissingTasks = missingTasks;
              finalMissingVersions = missingVersions;
              platform.info(`\u2713 Found ${installedTasks.length} task(s) from extension in ${accountUrl}`);
            }
          }
          if (!found && Date.now() < deadline) {
            platform.debug(`Waiting ${pollingIntervalMs / 1e3}s before next poll...`);
            await new Promise((resolve) => setTimeout(resolve, pollingIntervalMs));
          }
        } catch (error2) {
          lastError = error2 instanceof Error ? error2 : new Error(String(error2));
          platform.debug(`Error polling for tasks: ${lastError.message}. Retrying...`);
          if (Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, pollingIntervalMs));
          }
        }
      }
      if (found) {
        accountResults.push({
          accountUrl,
          available: true,
          installedTasks: finalInstalledTasks,
          missingTasks: finalMissingTasks,
          missingVersions: finalMissingVersions
        });
      } else {
        const errorMsg = lastError ? `Timeout waiting for tasks. Last error: ${lastError.message}` : `Timeout waiting for tasks after ${options.timeoutMinutes ?? 10} minutes`;
        platform.warning(errorMsg);
        const allMissingVersions = [];
        for (const task of expectedTasks) {
          for (const ver of task.versions) {
            allMissingVersions.push(`${task.name}@${ver}`);
          }
        }
        accountResults.push({
          accountUrl,
          available: false,
          installedTasks: [],
          missingTasks: expectedTasks.map((t) => t.name),
          missingVersions: allMissingVersions,
          error: errorMsg
        });
      }
    } catch (error2) {
      const errorMsg = error2 instanceof Error ? error2.message : String(error2);
      platform.error(`Failed to verify installation in ${accountUrl}: ${errorMsg}`);
      const allMissingVersions = [];
      for (const task of expectedTasks) {
        for (const ver of task.versions) {
          allMissingVersions.push(`${task.name}@${ver}`);
        }
      }
      accountResults.push({
        accountUrl,
        available: false,
        installedTasks: [],
        missingTasks: expectedTasks.map((t) => t.name),
        missingVersions: allMissingVersions,
        error: errorMsg
      });
    }
  }
  const allTasksAvailable = accountResults.every((r) => r.available && r.missingVersions.length === 0);
  if (allTasksAvailable) {
    platform.info(`\u2705 All tasks verified successfully across ${options.accounts.length} account(s)`);
  } else {
    const failedAccounts = accountResults.filter((r) => !r.available);
    const missingVersionAccounts = accountResults.filter((r) => r.available && r.missingVersions.length > 0);
    if (failedAccounts.length > 0) {
      platform.warning(`\u274C Failed to verify tasks in ${failedAccounts.length} account(s)`);
    }
    if (missingVersionAccounts.length > 0) {
      platform.warning(`\u26A0\uFE0F Missing versions found in ${missingVersionAccounts.length} account(s)`);
    }
  }
  return {
    success: allTasksAvailable,
    accountResults,
    allTasksAvailable
  };
}

// packages/github-action/src/auth/basic-auth.ts
async function getBasicAuth(username, password, serviceUrl, platform) {
  if (!username) {
    throw new Error("Username is required for basic authentication");
  }
  if (password === void 0 || password === null) {
    throw new Error("Password is required for basic authentication");
  }
  platform.setSecret(password);
  const finalServiceUrl = serviceUrl || "https://marketplace.visualstudio.com";
  return {
    authType: "basic",
    serviceUrl: finalServiceUrl,
    username,
    password
  };
}

// packages/github-action/src/auth/oidc-auth.ts
import * as core from "@actions/core";
import * as exec from "@actions/exec";
async function getOidcAuth(serviceUrl, platform) {
  const tokenResource = serviceUrl || "https://marketplace.visualstudio.com";
  const finalServiceUrl = serviceUrl || "https://marketplace.visualstudio.com";
  core.info("Getting Azure AD token via Azure CLI (requires azure/login action)...");
  try {
    let output = "";
    let errorOutput = "";
    const exitCode = await exec.exec(
      "az",
      ["account", "get-access-token", "--resource", tokenResource, "--output", "json"],
      {
        silent: true,
        listeners: {
          stdout: (data) => {
            output += data.toString();
          },
          stderr: (data) => {
            errorOutput += data.toString();
          }
        }
      }
    );
    if (exitCode !== 0) {
      throw new Error(`Azure CLI exited with code ${exitCode}: ${errorOutput}`);
    }
    const result = JSON.parse(output);
    const token = result.accessToken;
    if (!token) {
      throw new Error("No accessToken in Azure CLI response");
    }
    core.setSecret(token);
    platform.setSecret(token);
    core.info("Successfully obtained Azure AD token via Azure CLI");
    return {
      authType: "pat",
      // Use 'pat' type as the token format is similar
      serviceUrl: finalServiceUrl,
      token
    };
  } catch (error2) {
    const message = error2 instanceof Error ? error2.message : String(error2);
    throw new Error(
      `Failed to get Azure AD token via Azure CLI: ${message}

Make sure you have run the azure/login action before this action:
  - uses: azure/login@v2
    with:
      client-id: \${{ secrets.AZURE_CLIENT_ID }}
      tenant-id: \${{ secrets.AZURE_TENANT_ID }}
      subscription-id: \${{ secrets.AZURE_SUBSCRIPTION_ID }}

See: https://jessehouwing.net/authenticate-connect-mggraph-using-oidc-in-github-actions/`
    );
  }
}

// packages/github-action/src/auth/pat-auth.ts
async function getPatAuth(token, serviceUrl, platform) {
  if (!token) {
    throw new Error("PAT token is required");
  }
  platform.setSecret(token);
  const finalServiceUrl = serviceUrl || "https://marketplace.visualstudio.com";
  return {
    authType: "pat",
    serviceUrl: finalServiceUrl,
    token
  };
}

// packages/github-action/src/auth/index.ts
async function getAuth(authType, platform, options) {
  const finalServiceUrl = options.serviceUrl;
  switch (authType) {
    case "pat":
      if (!options.token) {
        throw new Error("Token is required for PAT authentication");
      }
      return getPatAuth(options.token, finalServiceUrl, platform);
    case "basic":
      if (!options.username || !options.password) {
        throw new Error("Username and password are required for basic authentication");
      }
      return getBasicAuth(options.username, options.password, finalServiceUrl, platform);
    case "oidc":
      return getOidcAuth(finalServiceUrl, platform);
    default:
      throw new Error(`Unsupported auth type: ${authType}`);
  }
}

// packages/github-action/src/github-adapter.ts
import * as core5 from "@actions/core";
import * as exec3 from "@actions/exec";

// node_modules/@actions/glob/lib/internal-globber.js
import * as core3 from "@actions/core";
import * as fs2 from "fs";

// node_modules/@actions/glob/lib/internal-glob-options-helper.js
import * as core2 from "@actions/core";
function getOptions(copy) {
  const result = {
    followSymbolicLinks: true,
    implicitDescendants: true,
    matchDirectories: true,
    omitBrokenSymbolicLinks: true,
    excludeHiddenFiles: false
  };
  if (copy) {
    if (typeof copy.followSymbolicLinks === "boolean") {
      result.followSymbolicLinks = copy.followSymbolicLinks;
      core2.debug(`followSymbolicLinks '${result.followSymbolicLinks}'`);
    }
    if (typeof copy.implicitDescendants === "boolean") {
      result.implicitDescendants = copy.implicitDescendants;
      core2.debug(`implicitDescendants '${result.implicitDescendants}'`);
    }
    if (typeof copy.matchDirectories === "boolean") {
      result.matchDirectories = copy.matchDirectories;
      core2.debug(`matchDirectories '${result.matchDirectories}'`);
    }
    if (typeof copy.omitBrokenSymbolicLinks === "boolean") {
      result.omitBrokenSymbolicLinks = copy.omitBrokenSymbolicLinks;
      core2.debug(`omitBrokenSymbolicLinks '${result.omitBrokenSymbolicLinks}'`);
    }
    if (typeof copy.excludeHiddenFiles === "boolean") {
      result.excludeHiddenFiles = copy.excludeHiddenFiles;
      core2.debug(`excludeHiddenFiles '${result.excludeHiddenFiles}'`);
    }
  }
  return result;
}

// node_modules/@actions/glob/lib/internal-globber.js
import * as path8 from "path";

// node_modules/@actions/glob/lib/internal-path-helper.js
import * as path5 from "path";
import assert from "assert";
var IS_WINDOWS = process.platform === "win32";
function dirname2(p) {
  p = safeTrimTrailingSeparator(p);
  if (IS_WINDOWS && /^\\\\[^\\]+(\\[^\\]+)?$/.test(p)) {
    return p;
  }
  let result = path5.dirname(p);
  if (IS_WINDOWS && /^\\\\[^\\]+\\[^\\]+\\$/.test(result)) {
    result = safeTrimTrailingSeparator(result);
  }
  return result;
}
function ensureAbsoluteRoot(root, itemPath) {
  assert(root, `ensureAbsoluteRoot parameter 'root' must not be empty`);
  assert(itemPath, `ensureAbsoluteRoot parameter 'itemPath' must not be empty`);
  if (hasAbsoluteRoot(itemPath)) {
    return itemPath;
  }
  if (IS_WINDOWS) {
    if (itemPath.match(/^[A-Z]:[^\\/]|^[A-Z]:$/i)) {
      let cwd = process.cwd();
      assert(cwd.match(/^[A-Z]:\\/i), `Expected current directory to start with an absolute drive root. Actual '${cwd}'`);
      if (itemPath[0].toUpperCase() === cwd[0].toUpperCase()) {
        if (itemPath.length === 2) {
          return `${itemPath[0]}:\\${cwd.substr(3)}`;
        } else {
          if (!cwd.endsWith("\\")) {
            cwd += "\\";
          }
          return `${itemPath[0]}:\\${cwd.substr(3)}${itemPath.substr(2)}`;
        }
      } else {
        return `${itemPath[0]}:\\${itemPath.substr(2)}`;
      }
    } else if (normalizeSeparators(itemPath).match(/^\\$|^\\[^\\]/)) {
      const cwd = process.cwd();
      assert(cwd.match(/^[A-Z]:\\/i), `Expected current directory to start with an absolute drive root. Actual '${cwd}'`);
      return `${cwd[0]}:\\${itemPath.substr(1)}`;
    }
  }
  assert(hasAbsoluteRoot(root), `ensureAbsoluteRoot parameter 'root' must have an absolute root`);
  if (root.endsWith("/") || IS_WINDOWS && root.endsWith("\\")) {
  } else {
    root += path5.sep;
  }
  return root + itemPath;
}
function hasAbsoluteRoot(itemPath) {
  assert(itemPath, `hasAbsoluteRoot parameter 'itemPath' must not be empty`);
  itemPath = normalizeSeparators(itemPath);
  if (IS_WINDOWS) {
    return itemPath.startsWith("\\\\") || /^[A-Z]:\\/i.test(itemPath);
  }
  return itemPath.startsWith("/");
}
function hasRoot(itemPath) {
  assert(itemPath, `isRooted parameter 'itemPath' must not be empty`);
  itemPath = normalizeSeparators(itemPath);
  if (IS_WINDOWS) {
    return itemPath.startsWith("\\") || /^[A-Z]:/i.test(itemPath);
  }
  return itemPath.startsWith("/");
}
function normalizeSeparators(p) {
  p = p || "";
  if (IS_WINDOWS) {
    p = p.replace(/\//g, "\\");
    const isUnc = /^\\\\+[^\\]/.test(p);
    return (isUnc ? "\\" : "") + p.replace(/\\\\+/g, "\\");
  }
  return p.replace(/\/\/+/g, "/");
}
function safeTrimTrailingSeparator(p) {
  if (!p) {
    return "";
  }
  p = normalizeSeparators(p);
  if (!p.endsWith(path5.sep)) {
    return p;
  }
  if (p === path5.sep) {
    return p;
  }
  if (IS_WINDOWS && /^[A-Z]:\\$/i.test(p)) {
    return p;
  }
  return p.substr(0, p.length - 1);
}

// node_modules/@actions/glob/lib/internal-match-kind.js
var MatchKind;
(function(MatchKind2) {
  MatchKind2[MatchKind2["None"] = 0] = "None";
  MatchKind2[MatchKind2["Directory"] = 1] = "Directory";
  MatchKind2[MatchKind2["File"] = 2] = "File";
  MatchKind2[MatchKind2["All"] = 3] = "All";
})(MatchKind || (MatchKind = {}));

// node_modules/@actions/glob/lib/internal-pattern-helper.js
var IS_WINDOWS2 = process.platform === "win32";
function getSearchPaths(patterns) {
  patterns = patterns.filter((x) => !x.negate);
  const searchPathMap = {};
  for (const pattern of patterns) {
    const key = IS_WINDOWS2 ? pattern.searchPath.toUpperCase() : pattern.searchPath;
    searchPathMap[key] = "candidate";
  }
  const result = [];
  for (const pattern of patterns) {
    const key = IS_WINDOWS2 ? pattern.searchPath.toUpperCase() : pattern.searchPath;
    if (searchPathMap[key] === "included") {
      continue;
    }
    let foundAncestor = false;
    let tempKey = key;
    let parent = dirname2(tempKey);
    while (parent !== tempKey) {
      if (searchPathMap[parent]) {
        foundAncestor = true;
        break;
      }
      tempKey = parent;
      parent = dirname2(tempKey);
    }
    if (!foundAncestor) {
      result.push(pattern.searchPath);
      searchPathMap[key] = "included";
    }
  }
  return result;
}
function match(patterns, itemPath) {
  let result = MatchKind.None;
  for (const pattern of patterns) {
    if (pattern.negate) {
      result &= ~pattern.match(itemPath);
    } else {
      result |= pattern.match(itemPath);
    }
  }
  return result;
}
function partialMatch(patterns, itemPath) {
  return patterns.some((x) => !x.negate && x.partialMatch(itemPath));
}

// node_modules/@actions/glob/lib/internal-pattern.js
import * as os from "os";
import * as path7 from "path";
var import_minimatch = __toESM(require_minimatch(), 1);
import assert3 from "assert";

// node_modules/@actions/glob/lib/internal-path.js
import * as path6 from "path";
import assert2 from "assert";
var IS_WINDOWS3 = process.platform === "win32";
var Path = class {
  /**
   * Constructs a Path
   * @param itemPath Path or array of segments
   */
  constructor(itemPath) {
    this.segments = [];
    if (typeof itemPath === "string") {
      assert2(itemPath, `Parameter 'itemPath' must not be empty`);
      itemPath = safeTrimTrailingSeparator(itemPath);
      if (!hasRoot(itemPath)) {
        this.segments = itemPath.split(path6.sep);
      } else {
        let remaining = itemPath;
        let dir = dirname2(remaining);
        while (dir !== remaining) {
          const basename3 = path6.basename(remaining);
          this.segments.unshift(basename3);
          remaining = dir;
          dir = dirname2(remaining);
        }
        this.segments.unshift(remaining);
      }
    } else {
      assert2(itemPath.length > 0, `Parameter 'itemPath' must not be an empty array`);
      for (let i = 0; i < itemPath.length; i++) {
        let segment = itemPath[i];
        assert2(segment, `Parameter 'itemPath' must not contain any empty segments`);
        segment = normalizeSeparators(itemPath[i]);
        if (i === 0 && hasRoot(segment)) {
          segment = safeTrimTrailingSeparator(segment);
          assert2(segment === dirname2(segment), `Parameter 'itemPath' root segment contains information for multiple segments`);
          this.segments.push(segment);
        } else {
          assert2(!segment.includes(path6.sep), `Parameter 'itemPath' contains unexpected path separators`);
          this.segments.push(segment);
        }
      }
    }
  }
  /**
   * Converts the path to it's string representation
   */
  toString() {
    let result = this.segments[0];
    let skipSlash = result.endsWith(path6.sep) || IS_WINDOWS3 && /^[A-Z]:$/i.test(result);
    for (let i = 1; i < this.segments.length; i++) {
      if (skipSlash) {
        skipSlash = false;
      } else {
        result += path6.sep;
      }
      result += this.segments[i];
    }
    return result;
  }
};

// node_modules/@actions/glob/lib/internal-pattern.js
var { Minimatch } = import_minimatch.default;
var IS_WINDOWS4 = process.platform === "win32";
var Pattern = class _Pattern {
  constructor(patternOrNegate, isImplicitPattern = false, segments, homedir2) {
    this.negate = false;
    let pattern;
    if (typeof patternOrNegate === "string") {
      pattern = patternOrNegate.trim();
    } else {
      segments = segments || [];
      assert3(segments.length, `Parameter 'segments' must not empty`);
      const root = _Pattern.getLiteral(segments[0]);
      assert3(root && hasAbsoluteRoot(root), `Parameter 'segments' first element must be a root path`);
      pattern = new Path(segments).toString().trim();
      if (patternOrNegate) {
        pattern = `!${pattern}`;
      }
    }
    while (pattern.startsWith("!")) {
      this.negate = !this.negate;
      pattern = pattern.substr(1).trim();
    }
    pattern = _Pattern.fixupPattern(pattern, homedir2);
    this.segments = new Path(pattern).segments;
    this.trailingSeparator = normalizeSeparators(pattern).endsWith(path7.sep);
    pattern = safeTrimTrailingSeparator(pattern);
    let foundGlob = false;
    const searchSegments = this.segments.map((x) => _Pattern.getLiteral(x)).filter((x) => !foundGlob && !(foundGlob = x === ""));
    this.searchPath = new Path(searchSegments).toString();
    this.rootRegExp = new RegExp(_Pattern.regExpEscape(searchSegments[0]), IS_WINDOWS4 ? "i" : "");
    this.isImplicitPattern = isImplicitPattern;
    const minimatchOptions = {
      dot: true,
      nobrace: true,
      nocase: IS_WINDOWS4,
      nocomment: true,
      noext: true,
      nonegate: true
    };
    pattern = IS_WINDOWS4 ? pattern.replace(/\\/g, "/") : pattern;
    this.minimatch = new Minimatch(pattern, minimatchOptions);
  }
  /**
   * Matches the pattern against the specified path
   */
  match(itemPath) {
    if (this.segments[this.segments.length - 1] === "**") {
      itemPath = normalizeSeparators(itemPath);
      if (!itemPath.endsWith(path7.sep) && this.isImplicitPattern === false) {
        itemPath = `${itemPath}${path7.sep}`;
      }
    } else {
      itemPath = safeTrimTrailingSeparator(itemPath);
    }
    if (this.minimatch.match(itemPath)) {
      return this.trailingSeparator ? MatchKind.Directory : MatchKind.All;
    }
    return MatchKind.None;
  }
  /**
   * Indicates whether the pattern may match descendants of the specified path
   */
  partialMatch(itemPath) {
    itemPath = safeTrimTrailingSeparator(itemPath);
    if (dirname2(itemPath) === itemPath) {
      return this.rootRegExp.test(itemPath);
    }
    return this.minimatch.matchOne(itemPath.split(IS_WINDOWS4 ? /\\+/ : /\/+/), this.minimatch.set[0], true);
  }
  /**
   * Escapes glob patterns within a path
   */
  static globEscape(s) {
    return (IS_WINDOWS4 ? s : s.replace(/\\/g, "\\\\")).replace(/(\[)(?=[^/]+\])/g, "[[]").replace(/\?/g, "[?]").replace(/\*/g, "[*]");
  }
  /**
   * Normalizes slashes and ensures absolute root
   */
  static fixupPattern(pattern, homedir2) {
    assert3(pattern, "pattern cannot be empty");
    const literalSegments = new Path(pattern).segments.map((x) => _Pattern.getLiteral(x));
    assert3(literalSegments.every((x, i) => (x !== "." || i === 0) && x !== ".."), `Invalid pattern '${pattern}'. Relative pathing '.' and '..' is not allowed.`);
    assert3(!hasRoot(pattern) || literalSegments[0], `Invalid pattern '${pattern}'. Root segment must not contain globs.`);
    pattern = normalizeSeparators(pattern);
    if (pattern === "." || pattern.startsWith(`.${path7.sep}`)) {
      pattern = _Pattern.globEscape(process.cwd()) + pattern.substr(1);
    } else if (pattern === "~" || pattern.startsWith(`~${path7.sep}`)) {
      homedir2 = homedir2 || os.homedir();
      assert3(homedir2, "Unable to determine HOME directory");
      assert3(hasAbsoluteRoot(homedir2), `Expected HOME directory to be a rooted path. Actual '${homedir2}'`);
      pattern = _Pattern.globEscape(homedir2) + pattern.substr(1);
    } else if (IS_WINDOWS4 && (pattern.match(/^[A-Z]:$/i) || pattern.match(/^[A-Z]:[^\\]/i))) {
      let root = ensureAbsoluteRoot("C:\\dummy-root", pattern.substr(0, 2));
      if (pattern.length > 2 && !root.endsWith("\\")) {
        root += "\\";
      }
      pattern = _Pattern.globEscape(root) + pattern.substr(2);
    } else if (IS_WINDOWS4 && (pattern === "\\" || pattern.match(/^\\[^\\]/))) {
      let root = ensureAbsoluteRoot("C:\\dummy-root", "\\");
      if (!root.endsWith("\\")) {
        root += "\\";
      }
      pattern = _Pattern.globEscape(root) + pattern.substr(1);
    } else {
      pattern = ensureAbsoluteRoot(_Pattern.globEscape(process.cwd()), pattern);
    }
    return normalizeSeparators(pattern);
  }
  /**
   * Attempts to unescape a pattern segment to create a literal path segment.
   * Otherwise returns empty string.
   */
  static getLiteral(segment) {
    let literal = "";
    for (let i = 0; i < segment.length; i++) {
      const c = segment[i];
      if (c === "\\" && !IS_WINDOWS4 && i + 1 < segment.length) {
        literal += segment[++i];
        continue;
      } else if (c === "*" || c === "?") {
        return "";
      } else if (c === "[" && i + 1 < segment.length) {
        let set = "";
        let closed = -1;
        for (let i2 = i + 1; i2 < segment.length; i2++) {
          const c2 = segment[i2];
          if (c2 === "\\" && !IS_WINDOWS4 && i2 + 1 < segment.length) {
            set += segment[++i2];
            continue;
          } else if (c2 === "]") {
            closed = i2;
            break;
          } else {
            set += c2;
          }
        }
        if (closed >= 0) {
          if (set.length > 1) {
            return "";
          }
          if (set) {
            literal += set;
            i = closed;
            continue;
          }
        }
      }
      literal += c;
    }
    return literal;
  }
  /**
   * Escapes regexp special characters
   * https://javascript.info/regexp-escaping
   */
  static regExpEscape(s) {
    return s.replace(/[[\\^$.|?*+()]/g, "\\$&");
  }
};

// node_modules/@actions/glob/lib/internal-search-state.js
var SearchState = class {
  constructor(path10, level) {
    this.path = path10;
    this.level = level;
  }
};

// node_modules/@actions/glob/lib/internal-globber.js
var __awaiter = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __asyncValues = function(o) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator], i;
  return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
    return this;
  }, i);
  function verb(n) {
    i[n] = o[n] && function(v) {
      return new Promise(function(resolve, reject) {
        v = o[n](v), settle(resolve, reject, v.done, v.value);
      });
    };
  }
  function settle(resolve, reject, d, v) {
    Promise.resolve(v).then(function(v2) {
      resolve({ value: v2, done: d });
    }, reject);
  }
};
var __await = function(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
};
var __asyncGenerator = function(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function() {
    return this;
  }, i;
  function awaitReturn(f) {
    return function(v) {
      return Promise.resolve(v).then(f, reject);
    };
  }
  function verb(n, f) {
    if (g[n]) {
      i[n] = function(v) {
        return new Promise(function(a, b) {
          q.push([n, v, a, b]) > 1 || resume(n, v);
        });
      };
      if (f) i[n] = f(i[n]);
    }
  }
  function resume(n, v) {
    try {
      step(g[n](v));
    } catch (e) {
      settle(q[0][3], e);
    }
  }
  function step(r) {
    r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
  }
  function fulfill(value) {
    resume("next", value);
  }
  function reject(value) {
    resume("throw", value);
  }
  function settle(f, v) {
    if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
  }
};
var IS_WINDOWS5 = process.platform === "win32";
var DefaultGlobber = class _DefaultGlobber {
  constructor(options) {
    this.patterns = [];
    this.searchPaths = [];
    this.options = getOptions(options);
  }
  getSearchPaths() {
    return this.searchPaths.slice();
  }
  glob() {
    return __awaiter(this, void 0, void 0, function* () {
      var _a, e_1, _b, _c;
      const result = [];
      try {
        for (var _d = true, _e = __asyncValues(this.globGenerator()), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
          _c = _f.value;
          _d = false;
          const itemPath = _c;
          result.push(itemPath);
        }
      } catch (e_1_1) {
        e_1 = { error: e_1_1 };
      } finally {
        try {
          if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
      return result;
    });
  }
  globGenerator() {
    return __asyncGenerator(this, arguments, function* globGenerator_1() {
      const options = getOptions(this.options);
      const patterns = [];
      for (const pattern of this.patterns) {
        patterns.push(pattern);
        if (options.implicitDescendants && (pattern.trailingSeparator || pattern.segments[pattern.segments.length - 1] !== "**")) {
          patterns.push(new Pattern(pattern.negate, true, pattern.segments.concat("**")));
        }
      }
      const stack = [];
      for (const searchPath of getSearchPaths(patterns)) {
        core3.debug(`Search path '${searchPath}'`);
        try {
          yield __await(fs2.promises.lstat(searchPath));
        } catch (err) {
          if (err.code === "ENOENT") {
            continue;
          }
          throw err;
        }
        stack.unshift(new SearchState(searchPath, 1));
      }
      const traversalChain = [];
      while (stack.length) {
        const item = stack.pop();
        const match2 = match(patterns, item.path);
        const partialMatch2 = !!match2 || partialMatch(patterns, item.path);
        if (!match2 && !partialMatch2) {
          continue;
        }
        const stats = yield __await(
          _DefaultGlobber.stat(item, options, traversalChain)
          // Broken symlink, or symlink cycle detected, or no longer exists
        );
        if (!stats) {
          continue;
        }
        if (options.excludeHiddenFiles && path8.basename(item.path).match(/^\./)) {
          continue;
        }
        if (stats.isDirectory()) {
          if (match2 & MatchKind.Directory && options.matchDirectories) {
            yield yield __await(item.path);
          } else if (!partialMatch2) {
            continue;
          }
          const childLevel = item.level + 1;
          const childItems = (yield __await(fs2.promises.readdir(item.path))).map((x) => new SearchState(path8.join(item.path, x), childLevel));
          stack.push(...childItems.reverse());
        } else if (match2 & MatchKind.File) {
          yield yield __await(item.path);
        }
      }
    });
  }
  /**
   * Constructs a DefaultGlobber
   */
  static create(patterns, options) {
    return __awaiter(this, void 0, void 0, function* () {
      const result = new _DefaultGlobber(options);
      if (IS_WINDOWS5) {
        patterns = patterns.replace(/\r\n/g, "\n");
        patterns = patterns.replace(/\r/g, "\n");
      }
      const lines = patterns.split("\n").map((x) => x.trim());
      for (const line of lines) {
        if (!line || line.startsWith("#")) {
          continue;
        } else {
          result.patterns.push(new Pattern(line));
        }
      }
      result.searchPaths.push(...getSearchPaths(result.patterns));
      return result;
    });
  }
  static stat(item, options, traversalChain) {
    return __awaiter(this, void 0, void 0, function* () {
      let stats;
      if (options.followSymbolicLinks) {
        try {
          stats = yield fs2.promises.stat(item.path);
        } catch (err) {
          if (err.code === "ENOENT") {
            if (options.omitBrokenSymbolicLinks) {
              core3.debug(`Broken symlink '${item.path}'`);
              return void 0;
            }
            throw new Error(`No information found for the path '${item.path}'. This may indicate a broken symbolic link.`);
          }
          throw err;
        }
      } else {
        stats = yield fs2.promises.lstat(item.path);
      }
      if (stats.isDirectory() && options.followSymbolicLinks) {
        const realPath = yield fs2.promises.realpath(item.path);
        while (traversalChain.length >= item.level) {
          traversalChain.pop();
        }
        if (traversalChain.some((x) => x === realPath)) {
          core3.debug(`Symlink cycle detected for path '${item.path}' and realpath '${realPath}'`);
          return void 0;
        }
        traversalChain.push(realPath);
      }
      return stats;
    });
  }
};

// node_modules/@actions/glob/lib/internal-hash-files.js
import * as core4 from "@actions/core";

// node_modules/@actions/glob/lib/glob.js
var __awaiter2 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
function create(patterns, options) {
  return __awaiter2(this, void 0, void 0, function* () {
    return yield DefaultGlobber.create(patterns, options);
  });
}

// packages/github-action/src/github-adapter.ts
import * as io from "@actions/io";
import * as tc from "@actions/tool-cache";
import { promises as fs3 } from "fs";
import * as os2 from "os";
import path9 from "path";
var GitHubAdapter = class {
  // ===== Input =====
  getInput(name, required) {
    const value = core5.getInput(name, { required: required || false });
    return value || void 0;
  }
  getBoolInput(name, required) {
    const value = core5.getInput(name, { required: required || false });
    if (!value) {
      return false;
    }
    return core5.getBooleanInput(name, { required: required || false });
  }
  getDelimitedInput(name, delimiter, required) {
    const value = core5.getInput(name, { required: required || false });
    if (!value) return [];
    return value.split(delimiter).map((v) => v.trim()).filter((v) => v);
  }
  // ===== Output =====
  setOutput(name, value) {
    core5.setOutput(name, value);
  }
  setResult(result, message) {
    if (result === TaskResult.Succeeded) {
      core5.info(`\u2705 ${message}`);
    } else if (result === TaskResult.Failed) {
      core5.setFailed(message);
    } else {
      core5.warning(message);
    }
  }
  setVariable(name, value, isSecret, isOutput) {
    if (isSecret) {
      core5.setSecret(value);
    }
    if (isOutput) {
      core5.setOutput(name, value);
    } else {
      core5.exportVariable(name, value);
    }
  }
  setSecret(value) {
    core5.setSecret(value);
  }
  // ===== Logging =====
  debug(message) {
    core5.debug(message);
  }
  info(message) {
    core5.info(message);
  }
  warning(message) {
    core5.warning(message);
  }
  error(message) {
    core5.error(message);
  }
  isDebugEnabled() {
    return core5.isDebug() || process.env.ACTIONS_STEP_DEBUG === "true";
  }
  // ===== Execution =====
  async which(tool, check) {
    const result = await io.which(tool, check);
    return result;
  }
  async exec(tool, args, options) {
    let stderr = "";
    const toolCommand = tool.includes(" ") ? `"${tool}"` : tool;
    const listeners = {
      stdout: (data) => {
        const str = data.toString();
        if (options?.outStream) {
          options.outStream.write(str);
        }
      },
      stderr: (data) => {
        const str = data.toString();
        stderr += str;
        if (options?.errStream) {
          options.errStream.write(str);
        }
      }
    };
    const exitCode = await exec3.exec(toolCommand, args, {
      cwd: options?.cwd,
      env: options?.env,
      silent: options?.silent,
      ignoreReturnCode: options?.ignoreReturnCode,
      listeners
    });
    if (options?.failOnStdErr && stderr) {
      throw new Error(`Command failed with stderr: ${stderr}`);
    }
    return exitCode;
  }
  // ===== Filesystem =====
  async findMatch(root, patterns) {
    const normalizedPatterns = patterns.map((pattern) => pattern.trim()).filter((pattern) => pattern.length > 0).map((pattern) => {
      const isExclude = pattern.startsWith("!");
      const value = isExclude ? pattern.slice(1) : pattern;
      const rootedPattern = path9.isAbsolute(value) ? value : path9.join(root, value);
      const normalized = rootedPattern.replace(/\\/g, "/");
      return isExclude ? `!${normalized}` : normalized;
    });
    if (normalizedPatterns.length === 0) {
      return [];
    }
    const globber = await create(normalizedPatterns.join("\n"));
    const matches = await globber.glob();
    return Array.from(new Set(matches.map((match2) => path9.resolve(match2))));
  }
  async fileExists(filePath) {
    try {
      await fs3.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  async readFile(filePath) {
    return fs3.readFile(filePath, "utf-8");
  }
  async writeFile(filePath, content) {
    await fs3.writeFile(filePath, content, "utf-8");
  }
  async mkdirP(dirPath) {
    await io.mkdirP(dirPath);
  }
  async rmRF(dirPath) {
    await io.rmRF(dirPath);
  }
  // ===== Environment =====
  getVariable(name) {
    return process.env[name];
  }
  getTempDir() {
    return process.env.RUNNER_TEMP || os2.tmpdir();
  }
  // ===== Tool Management =====
  async cacheDir(sourceDir, tool, version) {
    return tc.cacheDir(sourceDir, tool, version);
  }
  findCachedTool(tool, version) {
    const found = tc.find(tool, version);
    return found || void 0;
  }
  async downloadTool(url) {
    return tc.downloadTool(url);
  }
};

// packages/github-action/src/main.ts
async function run() {
  try {
    const platform = new GitHubAdapter();
    await validateNodeAvailable(platform);
    const operation = platform.getInput("operation", true);
    if (!operation) {
      throw new Error("Operation is required");
    }
    platform.debug(`Starting operation: ${operation}`);
    const publisherId = platform.getInput("publisher-id");
    if (publisherId) {
      validatePublisherId(publisherId);
    }
    const extensionId = platform.getInput("extension-id");
    if (extensionId) {
      validateExtensionId(extensionId);
    }
    const extensionVersion = platform.getInput("extension-version");
    if (extensionVersion) {
      validateVersion(extensionVersion);
    }
    const tfxVersion = platform.getInput("tfx-version") || "built-in";
    if (tfxVersion === "path") {
      await validateTfxAvailable(platform);
    } else if (tfxVersion !== "built-in") {
      await validateNpmAvailable(platform);
    }
    const tfxManager = new TfxManager({ tfxVersion, platform });
    let auth;
    if (operation !== "package") {
      const authType = platform.getInput("auth-type") || "pat";
      if (authType === "oidc") {
        await validateAzureCliAvailable(platform);
      }
      const token = platform.getInput("token");
      const username = platform.getInput("username");
      const password = platform.getInput("password");
      const serviceUrl = platform.getInput("service-url");
      auth = await getAuth(authType, platform, {
        token,
        username,
        password,
        serviceUrl
      });
      if (auth.token) {
        platform.setSecret(auth.token);
      }
      if (auth.password) {
        platform.setSecret(auth.password);
      }
      if (auth.serviceUrl) {
        validateAccountUrl(auth.serviceUrl);
      }
    }
    if (operation === "install" || operation === "wait-for-installation") {
      const accounts = platform.getDelimitedInput("accounts", ";", false);
      accounts.forEach((account) => {
        if (account) {
          validateAccountUrl(account);
        }
      });
    }
    switch (operation) {
      case "package":
        await runPackage(platform, tfxManager);
        break;
      case "publish":
        await runPublish(platform, tfxManager, auth);
        break;
      case "unpublish":
        await runUnpublish(platform, tfxManager, auth);
        break;
      case "share":
        await runShare(platform, tfxManager, auth);
        break;
      case "unshare":
        await runUnshare(platform, tfxManager, auth);
        break;
      case "install":
        await runInstall(platform, tfxManager, auth);
        break;
      case "show":
        await runShow(platform, tfxManager, auth);
        break;
      case "query-version":
        await runQueryVersion(platform, tfxManager, auth);
        break;
      case "wait-for-validation":
        await runWaitForValidation(platform, tfxManager, auth);
        break;
      case "wait-for-installation":
        await runWaitForInstallation(platform, auth);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
    platform.info("\u2705 Operation completed successfully");
    platform.setResult(TaskResult.Succeeded, `${operation} completed successfully`);
  } catch (error2) {
    const message = error2 instanceof Error ? error2.message : String(error2);
    core6.setFailed(message);
  }
}
async function runPackage(platform, tfxManager) {
  const options = {
    rootFolder: platform.getInput("root-folder"),
    manifestGlobs: platform.getDelimitedInput("manifest-globs", "\n"),
    publisherId: platform.getInput("publisher-id"),
    extensionId: platform.getInput("extension-id"),
    extensionVersion: platform.getInput("extension-version"),
    extensionName: platform.getInput("extension-name"),
    extensionVisibility: platform.getInput("extension-visibility"),
    updateTasksVersion: platform.getBoolInput("update-tasks-version"),
    updateTasksId: platform.getBoolInput("update-tasks-id"),
    outputPath: platform.getInput("output-path"),
    bypassValidation: platform.getBoolInput("bypass-validation"),
    revVersion: platform.getBoolInput("rev-version")
  };
  const result = await packageExtension(options, tfxManager, platform);
  if (result.vsixPath) {
    platform.setOutput("vsix-path", result.vsixPath);
  }
}
async function runPublish(platform, tfxManager, auth) {
  const publishSource = platform.getInput("publish-source", true);
  const result = await publishExtension(
    {
      publishSource,
      vsixFile: publishSource === "vsix" ? platform.getInput("vsix-file", true) : void 0,
      manifestGlobs: publishSource === "manifest" ? platform.getDelimitedInput("manifest-globs", "\n", true) : void 0,
      rootFolder: publishSource === "manifest" ? platform.getInput("root-folder") : void 0,
      publisherId: platform.getInput("publisher-id"),
      extensionId: platform.getInput("extension-id"),
      extensionVersion: platform.getInput("extension-version"),
      extensionName: platform.getInput("extension-name"),
      extensionVisibility: platform.getInput("extension-visibility"),
      shareWith: platform.getDelimitedInput("share-with", "\n"),
      noWaitValidation: platform.getBoolInput("no-wait-validation"),
      bypassValidation: platform.getBoolInput("bypass-validation"),
      updateTasksVersion: platform.getBoolInput("update-tasks-version"),
      updateTasksId: platform.getBoolInput("update-tasks-id")
    },
    auth,
    tfxManager,
    platform
  );
  if (result.vsixPath) {
    platform.setOutput("vsix-path", result.vsixPath);
  }
  platform.debug(`Published: ${JSON.stringify(result)}`);
}
async function runUnpublish(platform, tfxManager, auth) {
  await unpublishExtension(
    {
      publisherId: platform.getInput("publisher-id", true),
      extensionId: platform.getInput("extension-id", true)
    },
    auth,
    tfxManager,
    platform
  );
}
async function runShare(platform, tfxManager, auth) {
  await shareExtension(
    {
      publisherId: platform.getInput("publisher-id", true),
      extensionId: platform.getInput("extension-id", true),
      shareWith: platform.getDelimitedInput("share-with", "\n", true)
    },
    auth,
    tfxManager,
    platform
  );
}
async function runUnshare(platform, tfxManager, auth) {
  await unshareExtension(
    {
      publisherId: platform.getInput("publisher-id", true),
      extensionId: platform.getInput("extension-id", true),
      unshareWith: platform.getDelimitedInput("unshare-with", "\n", true)
    },
    auth,
    tfxManager,
    platform
  );
}
async function runInstall(platform, tfxManager, auth) {
  const result = await installExtension(
    {
      publisherId: platform.getInput("publisher-id", true),
      extensionId: platform.getInput("extension-id", true),
      accounts: platform.getDelimitedInput("accounts", "\n", true),
      extensionVersion: platform.getInput("extension-version")
    },
    auth,
    tfxManager,
    platform
  );
  if (!result.allSuccess) {
    throw new Error(`Some accounts failed to install the extension`);
  }
}
async function runShow(platform, tfxManager, auth) {
  const options = {
    publisherId: platform.getInput("publisher-id", true),
    extensionId: platform.getInput("extension-id", true)
  };
  const result = await showExtension(options, auth, tfxManager, platform);
  if (result.metadata) {
    platform.setOutput("extension-metadata", JSON.stringify(result.metadata));
  }
}
async function runQueryVersion(platform, tfxManager, auth) {
  const result = await queryVersion(
    {
      publisherId: platform.getInput("publisher-id", true),
      extensionId: platform.getInput("extension-id", true),
      versionAction: platform.getInput("version-action") ?? "None",
      extensionVersionOverrideVariable: platform.getInput("extension-version-override")
    },
    auth,
    tfxManager,
    platform
  );
  platform.setOutput("proposed-version", result.proposedVersion);
  platform.setOutput("current-version", result.currentVersion);
}
async function runWaitForValidation(platform, tfxManager, auth) {
  const result = await waitForValidation(
    {
      publisherId: platform.getInput("publisher-id", true),
      extensionId: platform.getInput("extension-id", true),
      rootFolder: platform.getInput("root-folder"),
      manifestGlobs: platform.getDelimitedInput("manifest-globs", "\n"),
      maxRetries: parseInt(platform.getInput("max-retries") || "10"),
      minTimeout: parseInt(platform.getInput("min-timeout") || "1"),
      maxTimeout: parseInt(platform.getInput("max-timeout") || "15")
    },
    auth,
    tfxManager,
    platform
  );
  if (result.status !== "success") {
    throw new Error(`Validation failed with status: ${result.status}`);
  }
}
async function runWaitForInstallation(platform, auth) {
  const expectedTasksInput = platform.getInput("expected-tasks");
  let expectedTasks;
  if (expectedTasksInput) {
    try {
      expectedTasks = JSON.parse(expectedTasksInput);
    } catch (error2) {
      throw new Error(`Failed to parse expected-tasks: ${error2}`);
    }
  }
  const result = await waitForInstallation(
    {
      publisherId: platform.getInput("publisher-id", true),
      extensionId: platform.getInput("extension-id", true),
      accounts: platform.getDelimitedInput("accounts", "\n", true),
      expectedTasks,
      manifestPath: platform.getInput("manifest-path"),
      vsixPath: platform.getInput("vsix-path"),
      timeoutMinutes: parseInt(platform.getInput("timeout-minutes") || "10"),
      pollingIntervalSeconds: parseInt(platform.getInput("polling-interval-seconds") || "30")
    },
    auth,
    platform
  );
  if (!result.success) {
    throw new Error(`Verification failed - not all tasks are available`);
  }
}
void run();
//# sourceMappingURL=bundle.js.map
