import { readdir, unlink, stat } from "fs/promises";
import { join } from "path";

async function cleanDirectory(dirPath: string): Promise<string[]> {
  const removedFiles: string[] = [];

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively clean subdirectories
        const filesFromSubdir = await cleanDirectory(fullPath);
        removedFiles.push(...filesFromSubdir);
      } else if (entry.name.endsWith(".d.ts") || entry.name.endsWith(".map")) {
        // Remove matching files
        await unlink(fullPath);
        removedFiles.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error);
  }

  return removedFiles;
}

async function cleanDist() {
  const distPath = join(process.cwd(), "dist");

  try {
    const removedFiles = await cleanDirectory(distPath);

    if (removedFiles.length > 0) {
      console.log("Successfully cleaned up files in dist directory");
      // removedFiles.forEach((file) => console.log(`- ${file}`));
    } else {
      console.log("No .d.ts or .map files found to remove.");
    }
  } catch (error) {
    console.error("Error cleaning dist directory:", error);
    process.exit(1);
  }
}

cleanDist();
