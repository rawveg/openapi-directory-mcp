"use strict";
/**
 * Manifest manager for custom OpenAPI specifications
 * Handles indexing, storage paths, and metadata management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManifestManager = void 0;
/* eslint-disable no-console */
const path_1 = require("path");
const os_1 = require("os");
const fs_1 = require("fs");
const validation_js_1 = require("../utils/validation.js");
const errors_js_1 = require("../utils/errors.js");
class ManifestManager {
    constructor() {
        this.paths = this.initializePaths();
        this.manifest = this.loadManifest();
    }
    /**
     * Initialize storage paths with validation
     */
    initializePaths() {
        try {
            const baseDir = process.env.OPENAPI_DIRECTORY_CACHE_DIR
                ? (0, path_1.join)(process.env.OPENAPI_DIRECTORY_CACHE_DIR, "custom-specs")
                : (0, path_1.join)((0, os_1.homedir)(), ".cache", "openapi-directory-mcp", "custom-specs");
            // Validate and normalize base directory path
            validation_js_1.PathValidator.validatePath(baseDir);
            const validatedBaseDir = (0, path_1.normalize)((0, path_1.resolve)(baseDir));
            const specsDir = (0, path_1.join)(validatedBaseDir, "custom");
            const manifestFile = (0, path_1.join)(validatedBaseDir, "manifest.json");
            // Validate all paths
            validation_js_1.PathValidator.validatePath(specsDir);
            validation_js_1.PathValidator.validatePath(manifestFile);
            return {
                baseDir: validatedBaseDir,
                manifestFile,
                specsDir,
                getSpecFile: (name, version) => {
                    // Validate input parameters
                    if (!name || !version) {
                        throw new errors_js_1.ValidationError("Name and version are required for spec file path");
                    }
                    // Sanitize name and version to prevent path traversal
                    const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
                    const safeVersion = version.replace(/[^a-zA-Z0-9_.-]/g, "_");
                    const specFile = (0, path_1.join)(specsDir, safeName, `${safeVersion}.json`);
                    validation_js_1.PathValidator.validatePath(specFile);
                    return (0, path_1.normalize)(specFile);
                },
            };
        }
        catch (error) {
            throw errors_js_1.ErrorHandler.handleError(error, "Failed to initialize storage paths", "INIT_PATHS_ERROR");
        }
    }
    /**
     * Ensure directories exist
     */
    ensureDirectories() {
        if (!(0, fs_1.existsSync)(this.paths.baseDir)) {
            (0, fs_1.mkdirSync)(this.paths.baseDir, { recursive: true });
        }
        if (!(0, fs_1.existsSync)(this.paths.specsDir)) {
            (0, fs_1.mkdirSync)(this.paths.specsDir, { recursive: true });
        }
    }
    /**
     * Load manifest from disk with validation
     */
    loadManifest() {
        try {
            // Validate manifest file path
            validation_js_1.PathValidator.validatePath(this.paths.manifestFile);
            if (!(0, fs_1.existsSync)(this.paths.manifestFile)) {
                return this.createEmptyManifest();
            }
            const content = (0, fs_1.readFileSync)(this.paths.manifestFile, "utf-8");
            const manifest = JSON.parse(content);
            // Validate manifest structure
            if (!manifest.version || !manifest.specs || !manifest.lastUpdated) {
                console.warn("Invalid manifest structure, creating new one");
                return this.createEmptyManifest();
            }
            return manifest;
        }
        catch (error) {
            console.warn(`Failed to load manifest: ${error}. Creating new one.`);
            return this.createEmptyManifest();
        }
    }
    /**
     * Create empty manifest
     */
    createEmptyManifest() {
        return {
            version: "1.0.0",
            specs: {},
            lastUpdated: new Date().toISOString(),
        };
    }
    /**
     * Save manifest to disk with validation
     */
    saveManifest() {
        try {
            this.ensureDirectories();
            // Validate manifest file path before writing
            validation_js_1.PathValidator.validatePath(this.paths.manifestFile);
            this.manifest.lastUpdated = new Date().toISOString();
            const content = JSON.stringify(this.manifest, null, 2);
            // Validate content size before writing
            validation_js_1.FileValidator.validateFileSize(content.length);
            (0, fs_1.writeFileSync)(this.paths.manifestFile, content, "utf-8");
        }
        catch (error) {
            throw errors_js_1.ErrorHandler.handleError(error, "Failed to save manifest", "SAVE_MANIFEST_ERROR");
        }
    }
    /**
     * Add a spec to the manifest
     */
    addSpec(entry) {
        this.manifest.specs[entry.id] = entry;
        this.saveManifest();
    }
    /**
     * Remove a spec from the manifest
     */
    removeSpec(id) {
        if (this.manifest.specs[id]) {
            delete this.manifest.specs[id];
            this.saveManifest();
            return true;
        }
        return false;
    }
    /**
     * Update a spec in the manifest
     */
    updateSpec(id, updates) {
        if (this.manifest.specs[id]) {
            this.manifest.specs[id] = { ...this.manifest.specs[id], ...updates };
            this.saveManifest();
            return true;
        }
        return false;
    }
    /**
     * Get a spec from the manifest
     */
    getSpec(id) {
        return this.manifest.specs[id];
    }
    /**
     * List all specs in the manifest
     */
    listSpecs() {
        // Always reload manifest from disk to get latest state
        this.manifest = this.loadManifest();
        return Object.values(this.manifest.specs);
    }
    /**
     * Check if a spec exists
     */
    hasSpec(id) {
        return id in this.manifest.specs;
    }
    /**
     * Check if a name/version combination exists
     */
    hasNameVersion(name, version) {
        const id = `custom:${name}:${version}`;
        return this.hasSpec(id);
    }
    /**
     * Get storage paths
     */
    getPaths() {
        return this.paths;
    }
    /**
     * Store spec file on disk with validation
     */
    storeSpecFile(name, version, content) {
        try {
            // Validate inputs
            if (!name || !version || !content) {
                throw new errors_js_1.ValidationError("Name, version, and content are required");
            }
            // Validate content size and structure
            validation_js_1.FileValidator.validateFileSize(content.length);
            validation_js_1.FileValidator.validateOpenAPIContent(content);
            // Get validated spec file path
            const specFile = this.paths.getSpecFile(name, version);
            const specDir = (0, path_1.dirname)(specFile);
            // Validate the directory path before creating
            validation_js_1.PathValidator.validatePath(specDir);
            // Ensure spec directory exists
            if (!(0, fs_1.existsSync)(specDir)) {
                (0, fs_1.mkdirSync)(specDir, { recursive: true });
            }
            // Write file with validated path
            (0, fs_1.writeFileSync)(specFile, content, "utf-8");
            return specFile;
        }
        catch (error) {
            throw errors_js_1.ErrorHandler.handleError(error, `Failed to store spec file for ${name}:${version}`, "STORE_SPEC_ERROR");
        }
    }
    /**
     * Read spec file from disk with validation
     */
    readSpecFile(name, version) {
        try {
            // Validate inputs
            if (!name || !version) {
                throw new errors_js_1.ValidationError("Name and version are required");
            }
            // Get validated spec file path
            const specFile = this.paths.getSpecFile(name, version);
            // Additional path validation before file operations
            validation_js_1.PathValidator.validatePath(specFile);
            if (!(0, fs_1.existsSync)(specFile)) {
                throw new errors_js_1.ValidationError(`Spec file not found: ${specFile}`);
            }
            const content = (0, fs_1.readFileSync)(specFile, "utf-8");
            // Note: Content validation is handled by the CustomSpecClient
            // which extracts the actual OpenAPI spec from the wrapper structure
            return content;
        }
        catch (error) {
            throw errors_js_1.ErrorHandler.handleError(error, `Failed to read spec file for ${name}:${version}`, "READ_SPEC_ERROR");
        }
    }
    /**
     * Delete spec file from disk with validation
     */
    deleteSpecFile(name, version) {
        try {
            // Validate inputs
            if (!name || !version) {
                throw new errors_js_1.ValidationError("Name and version are required");
            }
            // Get validated spec file path
            const specFile = this.paths.getSpecFile(name, version);
            // Additional path validation before file operations
            validation_js_1.PathValidator.validatePath(specFile);
            if (!(0, fs_1.existsSync)(specFile)) {
                return false;
            }
            (0, fs_1.unlinkSync)(specFile);
            // Try to remove directory if empty
            const specDir = (0, path_1.dirname)(specFile);
            try {
                validation_js_1.PathValidator.validatePath(specDir);
                const files = (0, fs_1.readdirSync)(specDir);
                if (files.length === 0) {
                    (0, fs_1.rmdirSync)(specDir);
                }
            }
            catch {
                // Ignore errors when trying to remove directory
            }
            return true;
        }
        catch (error) {
            console.warn(`Failed to delete spec file for ${name}:${version}:`, error);
            return false;
        }
    }
    /**
     * Get file size of a spec with validation
     */
    getSpecFileSize(name, version) {
        try {
            // Validate inputs
            if (!name || !version) {
                return 0;
            }
            // Get validated spec file path
            const specFile = this.paths.getSpecFile(name, version);
            // Additional path validation before file operations
            validation_js_1.PathValidator.validatePath(specFile);
            if (!(0, fs_1.existsSync)(specFile)) {
                return 0;
            }
            return (0, fs_1.statSync)(specFile).size;
        }
        catch {
            return 0;
        }
    }
    /**
     * Generate unique spec ID
     */
    generateSpecId(name, version) {
        return `custom:${name}:${version}`;
    }
    /**
     * Parse spec ID into components
     */
    parseSpecId(id) {
        const parts = id.split(":");
        if (parts.length !== 3 || parts[0] !== "custom") {
            return null;
        }
        return {
            provider: parts[0],
            name: parts[1],
            version: parts[2],
        };
    }
    /**
     * Get manifest statistics
     */
    getStats() {
        const specs = this.listSpecs();
        return {
            totalSpecs: specs.length,
            totalSize: specs.reduce((sum, spec) => sum + spec.fileSize, 0),
            byFormat: {
                yaml: specs.filter((s) => s.originalFormat === "yaml").length,
                json: specs.filter((s) => s.originalFormat === "json").length,
            },
            bySource: {
                file: specs.filter((s) => s.sourceType === "file").length,
                url: specs.filter((s) => s.sourceType === "url").length,
            },
            lastUpdated: this.manifest.lastUpdated,
        };
    }
    /**
     * Validate manifest integrity with path validation
     */
    validateIntegrity() {
        const issues = [];
        try {
            const specs = this.listSpecs();
            for (const spec of specs) {
                try {
                    // Check if spec file exists
                    const parsed = this.parseSpecId(spec.id);
                    if (!parsed) {
                        issues.push(`Invalid spec ID format: ${spec.id}`);
                        continue;
                    }
                    // Validate the spec file path
                    const specFile = this.paths.getSpecFile(parsed.name, parsed.version);
                    validation_js_1.PathValidator.validatePath(specFile);
                    if (!(0, fs_1.existsSync)(specFile)) {
                        issues.push(`Spec file missing for ${spec.id}: ${specFile}`);
                        continue;
                    }
                    // Validate required fields
                    if (!spec.name || !spec.version || !spec.title) {
                        issues.push(`Missing required fields for ${spec.id}`);
                    }
                    // Check file size consistency
                    const actualSize = this.getSpecFileSize(parsed.name, parsed.version);
                    if (actualSize !== spec.fileSize && actualSize > 0) {
                        issues.push(`File size mismatch for ${spec.id}: expected ${spec.fileSize}, found ${actualSize}`);
                    }
                    // Note: Spec content validation is handled by CustomSpecClient
                    // as it needs to extract the actual OpenAPI spec from the wrapper
                }
                catch (specError) {
                    issues.push(`Error validating spec ${spec.id}: ${specError}`);
                }
            }
        }
        catch (error) {
            issues.push(`Error during integrity validation: ${error}`);
        }
        return {
            valid: issues.length === 0,
            issues,
        };
    }
    /**
     * Repair manifest integrity issues
     */
    repairIntegrity() {
        const repaired = [];
        const failed = [];
        const integrity = this.validateIntegrity();
        if (integrity.valid) {
            return { repaired, failed };
        }
        const specs = this.listSpecs();
        for (const spec of specs) {
            const parsed = this.parseSpecId(spec.id);
            if (!parsed) {
                this.removeSpec(spec.id);
                repaired.push(`Removed spec with invalid ID: ${spec.id}`);
                continue;
            }
            const specFile = this.paths.getSpecFile(parsed.name, parsed.version);
            // Remove specs with missing files
            if (!(0, fs_1.existsSync)(specFile)) {
                this.removeSpec(spec.id);
                repaired.push(`Removed spec with missing file: ${spec.id}`);
                continue;
            }
            // Update file size if incorrect
            const actualSize = this.getSpecFileSize(parsed.name, parsed.version);
            if (actualSize !== spec.fileSize && actualSize > 0) {
                this.updateSpec(spec.id, { fileSize: actualSize });
                repaired.push(`Updated file size for ${spec.id}`);
            }
        }
        return { repaired, failed };
    }
}
exports.ManifestManager = ManifestManager;
