import { readdir, cp, mkdir } from "fs/promises";
import { join } from "path";

const SOURCE_DIR = "dist";
const TARGET_DIR = "deploy";

async function copyFiles() {
	try {
		// Ensure the deploy directory exists
		await mkdir(TARGET_DIR, { recursive: true });

		// Copy all files from dist to deploy recursively
		await cp(SOURCE_DIR, TARGET_DIR, {
			recursive: true,
			force: true,
			preserveTimestamps: true,
		});

		console.log("✅ Successfully copied files from dist/ to deploy/");
	} catch (error) {
		console.error(
			"❌ Error copying files:",
			error instanceof Error ? error.message : String(error),
		);
		process.exit(1);
	}
}

// Execute the copy operation
copyFiles();
