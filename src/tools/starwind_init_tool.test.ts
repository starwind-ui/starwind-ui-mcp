import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { starwindInitTool } from "./starwind_init_tool.js";

describe("starwindInitTool", () => {
  it("targets v3 and keeps paid Pro authorization opt-in", async () => {
    const result = await starwindInitTool.handler({
      cwd: "/project-that-does-not-exist",
      packageManager: "pnpm",
    });
    expect(result).toMatchObject({
      success: true,
      command: "pnpm dlx starwind@latest init --defaults",
      proEnabled: false,
      frameworkSource: "cli-auto-detect",
    });
    expect(result.proDiscovery).toMatchObject({
      catalogUrl: "https://pro.starwind.dev/components/",
      setupCommand: "pnpm dlx starwind@latest setup --yes",
    });
  });

  it("supports an explicit React target without paid Pro", async () => {
    const result = await starwindInitTool.handler({
      cwd: "/project-that-does-not-exist",
      packageManager: "npm",
      framework: "react",
    });
    expect(result.command).toBe("npx starwind@latest init --defaults --framework react");
    expect(result.proDiscovery).toBeUndefined();
  });

  it("rejects paid Pro setup for React", async () => {
    const result = await starwindInitTool.handler({
      cwd: "/project-that-does-not-exist",
      packageManager: "npm",
      framework: "react",
      pro: true,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("target Astro");
  });

  it("prefers the configured framework over dependency hints", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-init-context-"));
    try {
      writeFileSync(
        join(cwd, "package.json"),
        JSON.stringify({ dependencies: { astro: "^5", react: "^19" } }),
      );
      writeFileSync(
        join(cwd, "starwind.config.json"),
        JSON.stringify({ version: 2, framework: "react", components: [] }),
      );
      const result = await starwindInitTool.handler({ cwd, packageManager: "pnpm" });
      expect(result.framework).toBe("react");
      expect(result.frameworkSource).toBe("starwind-config");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("allows explicitly requested paid Pro authorization for Astro", async () => {
    const result = await starwindInitTool.handler({
      cwd: "/project-that-does-not-exist",
      packageManager: "yarn",
      framework: "astro",
      pro: true,
    });
    expect(result.command).toBe("yarn dlx starwind@latest init --defaults --framework astro --pro");
    expect(result.proEnabled).toBe(true);
    expect(result.proUpgrade).toMatchObject({
      required: true,
      setupCommand: "yarn dlx starwind@latest init --defaults --framework astro --pro",
      purchaseUrl: "https://pro.starwind.dev/",
      licenseEnvironmentVariable: "STARWIND_LICENSE_KEY",
    });
  });
});
