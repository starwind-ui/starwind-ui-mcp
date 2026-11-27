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

  it("supports an explicit React target and keeps Pro discoverable with a warning", async () => {
    const result = await starwindInitTool.handler({
      cwd: "/project-that-does-not-exist",
      packageManager: "npm",
      framework: "react",
    });
    expect(result.command).toBe("npx starwind@latest init --defaults --framework react");
    expect(result.proDiscovery).toMatchObject({ setupCommand: "npx starwind@latest setup --yes" });
    expect(result.proFrameworkWarning).toContain("Astro components");
    expect(result.warnings).not.toEqual(
      expect.arrayContaining([expect.stringContaining("Astro components")]),
    );
  });

  it("allows paid Pro setup for React with the Astro components warning", async () => {
    const result = await starwindInitTool.handler({
      cwd: "/project-that-does-not-exist",
      packageManager: "npm",
      framework: "react",
      pro: true,
    });
    expect(result.success).toBe(true);
    expect(result.command).toBe("npx starwind@latest init --defaults --framework react --pro");
    expect(result.proUpgrade).toMatchObject({
      required: true,
      setupCommand: "npx starwind@latest init --defaults --framework react --pro",
    });
    expect(result.proFrameworkWarning).toContain("Astro components");
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("Astro components")]),
    );
  });

  it.each([
    ["vue", "Vue >=3.5.21"],
    ["svelte", "Svelte >=5.29.0 <6"],
  ] as const)("generates %s init commands and reports %s", async (framework, requirement) => {
    const result = await starwindInitTool.handler({
      cwd: "/project-that-does-not-exist",
      packageManager: "pnpm",
      framework,
    });
    expect(result).toMatchObject({
      success: true,
      command: `pnpm dlx starwind@latest init --defaults --framework ${framework}`,
      framework,
      frameworkSource: "user-specified",
    });
    expect((result.requirements as { framework: string }).framework).toContain(requirement);
    expect(result.proDiscovery).toBeDefined();
    expect(result.proFrameworkWarning).toContain("Astro components");

    const pro = await starwindInitTool.handler({
      cwd: "/project-that-does-not-exist",
      packageManager: "pnpm",
      framework,
      pro: true,
    });
    expect(pro.success).toBe(true);
    expect(pro.command).toBe(
      `pnpm dlx starwind@latest init --defaults --framework ${framework} --pro`,
    );
  });

  it("reads a Vue or Svelte framework from starwind.config.json", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-init-vue-config-"));
    try {
      writeFileSync(
        join(cwd, "package.json"),
        JSON.stringify({ dependencies: { vue: "^3.5.21" } }),
      );
      writeFileSync(
        join(cwd, "starwind.config.json"),
        JSON.stringify({ version: 2, framework: "svelte", components: [] }),
      );
      const result = await starwindInitTool.handler({ cwd, packageManager: "pnpm" });
      expect(result.framework).toBe("svelte");
      expect(result.frameworkSource).toBe("starwind-config");
      expect(result.command).toBe("pnpm dlx starwind@latest init --defaults");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("generates bunx commands for Bun", async () => {
    const result = await starwindInitTool.handler({
      cwd: "/project-that-does-not-exist",
      packageManager: "bun",
      framework: "svelte",
    });
    expect(result.command).toBe("bunx starwind@latest init --defaults --framework svelte");
    expect(result.packageManager).toBe("bun");
    expect(result.proDiscovery).toMatchObject({ setupCommand: "bunx starwind@latest setup --yes" });
  });

  it("detects Bun from bun.lock", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-init-bun-"));
    try {
      writeFileSync(join(cwd, "bun.lock"), "");
      const result = await starwindInitTool.handler({ cwd });
      expect(result).toMatchObject({
        packageManager: "bun",
        packageManagerSource: "detected",
        command: "bunx starwind@latest init --defaults",
      });
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
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

  it("routes a legacy config to migration guidance", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-init-legacy-"));
    try {
      writeFileSync(
        join(cwd, "starwind.config.json"),
        JSON.stringify({ framework: "astro", components: [] }),
      );
      const result = await starwindInitTool.handler({ cwd, packageManager: "npm" });
      expect(result.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining("starwind_migrate")]),
      );
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

  it("passes --framework vue for a detected Vue host so the CLI can offer the Vue upgrade", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-init-nuxt-"));
    try {
      writeFileSync(
        join(cwd, "package.json"),
        JSON.stringify({ dependencies: { nuxt: "^4", vue: "3.5.20" } }),
      );
      const result = await starwindInitTool.handler({ cwd, packageManager: "pnpm" });
      expect(result).toMatchObject({
        command: "pnpm dlx starwind@latest init --defaults --framework vue",
        framework: "vue",
        frameworkSource: "detected",
      });
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("keeps CLI auto-detection for other detected hosts", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-init-next-"));
    try {
      writeFileSync(
        join(cwd, "package.json"),
        JSON.stringify({ dependencies: { next: "^16", react: "^19" } }),
      );
      const result = await starwindInitTool.handler({ cwd, packageManager: "npm" });
      expect(result.command).toBe("npx starwind@latest init --defaults");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("uses the selected framework in the Pro new-project command", async () => {
    const vue = await starwindInitTool.handler({
      cwd: "/project-that-does-not-exist",
      packageManager: "npm",
      framework: "vue",
      pro: true,
    });
    const unknown = await starwindInitTool.handler({
      cwd: "/project-that-does-not-exist",
      packageManager: "npm",
      pro: true,
    });
    expect(vue.proUpgrade).toMatchObject({
      newProjectCommand: "npx starwind@latest init --defaults --framework vue --pro",
    });
    expect(unknown.proUpgrade).toMatchObject({
      newProjectCommand: "npx starwind@latest init --defaults --pro",
    });
  });
});
