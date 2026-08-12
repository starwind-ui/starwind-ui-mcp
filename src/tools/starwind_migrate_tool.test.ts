import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { starwindMigrateTool } from "./starwind_migrate_tool.js";

describe("starwindMigrateTool", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "starwind-migrate-test-"));
  });
  afterEach(() => rmSync(cwd, { recursive: true, force: true }));

  it("recognizes an existing legacy Astro config", async () => {
    writeFileSync(join(cwd, "package.json"), JSON.stringify({ dependencies: { astro: "^5" } }));
    writeFileSync(
      join(cwd, "starwind.config.json"),
      JSON.stringify({ framework: "astro", components: ["button"] }),
    );
    const result = await starwindMigrateTool.handler({ cwd, packageManager: "pnpm" });
    expect(result).toMatchObject({
      command: "pnpm dlx starwind@latest migrate",
      interactive: true,
      applicable: true,
    });
  });

  it("does not label a missing config as migratable", async () => {
    const result = await starwindMigrateTool.handler({ cwd, packageManager: "npm" });
    expect(result.applicable).toBe(false);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("No Starwind config")]),
    );
  });

  it("makes non-interactive overwrite behavior explicit", async () => {
    writeFileSync(join(cwd, "starwind.config.json"), JSON.stringify({ components: [] }));
    const result = await starwindMigrateTool.handler({ cwd, packageManager: "npm", yes: true });
    expect(result.command).toBe("npx starwind@latest migrate --yes --package-manager npm");
    expect(result.interactive).toBe(false);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("overwrites")]),
    );
  });
});
