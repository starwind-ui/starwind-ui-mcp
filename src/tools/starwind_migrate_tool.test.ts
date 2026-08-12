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
    expect(result.success).toBe(false);
    expect(result.command).toBeUndefined();
    expect(result.interactive).toBe(false);
    expect(result.reviewAfterMigration).toEqual([]);
    expect(result.warnings).not.toEqual(expect.arrayContaining([expect.stringContaining("Git")]));
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("No Starwind config")]),
    );
  });

  it("does not expose a migration command for an existing v2 config", async () => {
    writeFileSync(
      join(cwd, "starwind.config.json"),
      JSON.stringify({ version: 2, framework: "astro", components: [] }),
    );
    const result = await starwindMigrateTool.handler({ cwd, packageManager: "pnpm" });
    expect(result).toMatchObject({ success: false, applicable: false, interactive: false });
    expect(result.command).toBeUndefined();
    expect(result.reviewAfterMigration).toEqual([]);
    expect(result.warnings).not.toEqual(expect.arrayContaining([expect.stringContaining("Git")]));
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("v2 Runtime config")]),
    );
  });

  it("fails closed for a malformed config version", async () => {
    writeFileSync(
      join(cwd, "starwind.config.json"),
      JSON.stringify({ version: "2", framework: "astro", components: [] }),
    );
    const result = await starwindMigrateTool.handler({ cwd, packageManager: "npm" });
    expect(result).toMatchObject({ success: false, applicable: false, interactive: false });
    expect(result.command).toBeUndefined();
    expect(result.project).toMatchObject({ configVersion: null, configVersionInvalid: true });
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("invalid version")]),
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
