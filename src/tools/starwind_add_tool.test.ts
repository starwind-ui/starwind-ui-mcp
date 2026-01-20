import { beforeEach, describe, expect, it } from "vitest";

import { resetAddToolState, starwindAddTool } from "./starwind_add_tool";

describe("starwindAddTool", () => {
  beforeEach(() => {
    resetAddToolState(); // Reset cache between tests
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(starwindAddTool.name).toBe("starwind_add");
    });

    it("should have a description", () => {
      expect(starwindAddTool.description).toBeTruthy();
      expect(starwindAddTool.description).toContain("Starwind UI");
    });

    it("should have correct input schema", () => {
      expect(starwindAddTool.inputSchema.type).toBe("object");
      expect(starwindAddTool.inputSchema.properties).toHaveProperty("components");
      expect(starwindAddTool.inputSchema.properties).toHaveProperty("init");
      expect(starwindAddTool.inputSchema.properties).toHaveProperty("cwd");
      expect(starwindAddTool.inputSchema.properties).toHaveProperty("packageManager");
      expect(starwindAddTool.inputSchema.required).toContain("components");
    });
  });

  describe("handler - component fetching from starwind.dev", () => {
    it("should fetch components from llms.txt and validate them", async () => {
      const result = await starwindAddTool.handler({ components: ["button"] });

      expect(result.success).toBe(true);
      expect(result.componentSource).toMatch(/^(network|cache)$/);
      expect(result.componentsToInstall).toContain("button");
    });

    it("should return available components from starwind.dev", async () => {
      const result = await starwindAddTool.handler({ components: ["button"] });

      expect(Array.isArray(result.availableComponents)).toBe(true);
      const components = result.availableComponents as string[];
      // Should contain known components from starwind.dev
      expect(components).toContain("button");
      expect(components).toContain("card");
      expect(components).toContain("dialog");
      expect(components.length).toBeGreaterThan(20); // Should have many components
    });
  });

  describe("handler - command generation", () => {
    it("should generate install command with component names and --yes flag", async () => {
      const result = await starwindAddTool.handler({ components: ["button"] });

      expect(result.success).toBe(true);
      expect(result.command).toContain("starwind@latest add button");
      expect(result.command).toContain("--yes");
    });

    it("should handle multiple components", async () => {
      const result = await starwindAddTool.handler({
        components: ["button", "card", "dialog"],
      });

      expect(result.success).toBe(true);
      expect(result.componentsToInstall).toEqual(["button", "card", "dialog"]);
      expect(result.command).toContain("button card dialog");
    });

    it("should handle --all flag with --yes", async () => {
      const result = await starwindAddTool.handler({ components: ["--all"] });

      expect(result.success).toBe(true);
      expect(result.command).toContain("--all");
      expect(result.command).toContain("--yes");
      expect(result.componentsToInstall).toEqual(["all"]);
    });

    it("should handle 'all' as component name", async () => {
      const result = await starwindAddTool.handler({ components: ["all"] });

      expect(result.success).toBe(true);
      expect(result.command).toContain("--all");
    });

    it("should include init command when init is true", async () => {
      const result = await starwindAddTool.handler({
        components: ["button"],
        init: true,
      });

      expect(result.commands).toHaveLength(2);
      expect((result.commands as string[])[0]).toContain("init --defaults");
      expect((result.commands as string[])[1]).toContain("add button");
      expect(result.command).toContain("&&");
    });
  });

  describe("handler - validation", () => {
    it("should throw error when no components provided", async () => {
      await expect(starwindAddTool.handler({ components: [] })).rejects.toThrow(
        "At least one component must be specified",
      );
    });

    it("should return error for invalid components", async () => {
      const result = await starwindAddTool.handler({
        components: ["zzzznonexistent"],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("No valid components specified");
      expect(result.invalidComponents).toContain("zzzznonexistent");
    });

    it("should provide suggestions for similar components", async () => {
      const result = await starwindAddTool.handler({
        components: ["but"], // partial match - "but" is contained in "button"
      });

      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
      // "but" is contained in "button", so button should be suggested
      const suggestions = result.suggestions as Record<string, string[]>;
      expect(suggestions["but"]).toContain("button");
    });

    it("should include valid components and warn about invalid ones", async () => {
      const result = await starwindAddTool.handler({
        components: ["button", "zzzznonexistent"],
      });

      expect(result.success).toBe(true);
      expect(result.componentsToInstall).toEqual(["button"]);
      expect(result.warnings).toBeDefined();
      expect((result.warnings as { invalidComponents: string[] }).invalidComponents).toContain(
        "zzzznonexistent",
      );
    });

    it("should normalize component names to lowercase", async () => {
      const result = await starwindAddTool.handler({
        components: ["BUTTON", "Card"],
      });

      expect(result.success).toBe(true);
      expect(result.componentsToInstall).toEqual(["button", "card"]);
    });
  });

  describe("handler - response structure", () => {
    it("should include all required fields in successful response", async () => {
      const result = await starwindAddTool.handler({ components: ["button"] });

      expect(result.success).toBe(true);
      expect(result.packageManager).toBeDefined();
      expect(result.commands).toBeDefined();
      expect(result.command).toBeDefined();
      expect(result.componentsToInstall).toBeDefined();
      expect(result.availableComponents).toBeDefined();
      expect(result.instructions).toBeDefined();
      expect(result.componentSource).toBeDefined();
    });

    it("should include available components list from starwind.dev", async () => {
      const result = await starwindAddTool.handler({ components: ["button"] });

      expect(Array.isArray(result.availableComponents)).toBe(true);
      expect((result.availableComponents as string[]).length).toBeGreaterThan(0);
    });

    it("should include cliFlags info in response", async () => {
      const result = await starwindAddTool.handler({ components: ["button"] });

      expect(result.cliFlags).toBeDefined();
      const cliFlags = result.cliFlags as { note: string; availableFlags: Record<string, string[]> };
      expect(cliFlags.note).toContain("--yes");
      expect(cliFlags.availableFlags.add).toBeDefined();
      expect(cliFlags.availableFlags.init).toBeDefined();
    });
  });

  describe("handler - packageManager override", () => {
    it("should use specified packageManager instead of auto-detection", async () => {
      const result = await starwindAddTool.handler({
        components: ["button"],
        packageManager: "yarn",
      });

      expect(result.success).toBe(true);
      expect(result.packageManager).toBe("yarn");
      expect(result.command).toContain("yarn dlx");
    });

    it("should use pnpm dlx when pnpm is specified", async () => {
      const result = await starwindAddTool.handler({
        components: ["button"],
        packageManager: "pnpm",
      });

      expect(result.packageManager).toBe("pnpm");
      expect(result.command).toContain("pnpm dlx");
    });

    it("should use npx when npm is specified", async () => {
      const result = await starwindAddTool.handler({
        components: ["button"],
        packageManager: "npm",
      });

      expect(result.packageManager).toBe("npm");
      expect(result.command).toContain("npx");
    });
  });
});
