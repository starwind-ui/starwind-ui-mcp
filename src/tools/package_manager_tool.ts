/**
 * Package Manager Tool for the MCP Server
 */
import { detectPackageManager } from "../utils/package_manager.js";
import { existsSync } from "fs";
import { resolve } from "path";

/**
 * Debug flag to enable/disable console logging
 */
const DEBUG = false;

/**
 * Helper function for conditional logging
 */
const log = (...args: any[]) => {
	if (DEBUG) {
		console.log(...args);
	}
};

/**
 * Interface for package manager detection arguments
 */
export interface PackageManagerDetectionArgs {
	/** Root directory to check for lock files (required) */
	cwd: string;
	/** Default package manager to use if detection fails (defaults to 'pnpm') */
	defaultManager?: string;
}

/**
 * Package Manager tool definition
 */
export const packageManagerTool = {
	name: "get_package_manager",
	description: "Detects and returns the current package manager information",
	inputSchema: {
		type: "object",
		properties: {
			cwd: {
				type: "string",
				description: "Root directory to check for lock files",
			},
			defaultManager: {
				type: "string",
				description: "Default package manager to use if detection fails (npm, yarn, pnpm)",
				enum: ["npm", "yarn", "pnpm"],
			},
		},
		required: ["cwd"],
	},
	handler: async (args: PackageManagerDetectionArgs) => {
		// Debug logging
		log("MCP Tool - get_package_manager called with args:", args);
		log("MCP Tool - Current working directory:", process.cwd());

		// Check for lock files directly in the handler
		const lockFiles = {
			pnpm: "pnpm-lock.yaml",
			yarn: "yarn.lock",
			npm: "package-lock.json",
		};

		// Log existence of each lock file
		Object.entries(lockFiles).forEach(([pm, file]) => {
			const lockPath = resolve(process.cwd(), file);
			log(`MCP Tool - ${pm} lock file (${file}) exists:`, existsSync(lockPath));
		});

		// Only include options that are actually provided
		const options: Record<string, any> = {
			cwd: args.cwd, // cwd is now required
		};

		if (args.defaultManager) {
			options.defaultManager = args.defaultManager;
		} else {
			// Set npm as default if not specified
			options.defaultManager = "npm";
		}

		log("MCP Tool - Calling detectPackageManager with options:", options);
		const pmInfo = detectPackageManager(options);
		log("MCP Tool - Detection result:", pmInfo);

		return {
			name: pmInfo.name,
			commands: {
				install: pmInfo.installCmd,
				add: pmInfo.addCmd,
				remove: pmInfo.removeCmd,
				run: pmInfo.runCmd,
			},
			// cwd: options.cwd,
		};
	},
};
