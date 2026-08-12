import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { inspectStarwindProject } from "./project_context.js";

describe("inspectStarwindProject", () => {
  it("recognizes Astro config files even when the dependency signal is unavailable", () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-project-context-"));
    try {
      writeFileSync(join(cwd, "astro.config.mjs"), "export default {};");
      expect(inspectStarwindProject(cwd).detectedFramework).toBe("astro");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("detects Pro registry configuration without returning credentials", () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-project-pro-"));
    try {
      writeFileSync(
        join(cwd, "starwind.config.json"),
        JSON.stringify({
          version: 2,
          framework: "astro",
          pro: {
            registry: {
              headers: { Authorization: "Bearer ${STARWIND_LICENSE_KEY}" },
            },
          },
        }),
      );

      const context = inspectStarwindProject(cwd);
      expect(context.proRegistryConfigured).toBe(true);
      expect(JSON.stringify(context)).not.toContain("Bearer");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("does not treat valid non-object JSON as project configuration", () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-project-invalid-json-shape-"));
    try {
      writeFileSync(join(cwd, "package.json"), "[]");
      writeFileSync(join(cwd, "starwind.config.json"), '"text"');
      const context = inspectStarwindProject(cwd);
      expect(context.packageJsonFound).toBe(false);
      expect(context.starwindConfigFound).toBe(false);
      expect(context.configVersion).toBeNull();
      expect(context.configVersionInvalid).toBe(false);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
